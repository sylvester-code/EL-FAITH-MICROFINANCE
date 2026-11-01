import { Decimal } from 'decimal.js';

// Configure Decimal.js for financial accuracy (Ghanaian Cedi standard: 2 decimal places, ROUND_HALF_UP)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calculate installment due date
 * Repayment date starts from the disbursement day or custom date set by Super Admin,
 * and automatically sets repayment dates daily.
 */
export const calculateInstallmentDueDate = (startDate, installmentNumber, repaymentFrequency, customFirstDueDate = null) => {
  const baseFirstDate = customFirstDueDate ? new Date(customFirstDueDate) : new Date(startDate);

  if (installmentNumber === 1) {
    return baseFirstDate;
  }

  const offset = installmentNumber - 1;
  const dueDate = new Date(baseFirstDate);

  switch (repaymentFrequency) {
    case 'WEEKLY':
      dueDate.setDate(dueDate.getDate() + (offset * 7));
      break;
    case 'FORTNIGHTLY':
      dueDate.setDate(dueDate.getDate() + (offset * 14));
      break;
    case 'DAILY':
    default:
      dueDate.setDate(dueDate.getDate() + (offset * 1));
      break;
    case 'MONTHLY':
      dueDate.setMonth(dueDate.getMonth() + offset);
      break;
  }

  return dueDate;
};

/**
 * Rounds a Decimal to 2 decimal places (Ghanaian Cedi standard)
 */
export const roundMoney = (val) => {
  return new Decimal(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
};

/**
 * Calculate loan summary and repayment schedule
 * @param {Object} params
 * @param {number|string} params.principal - Loan principal amount
 * @param {number|string} params.interestRate - Monthly or annual interest rate percentage
 * @param {string} params.interestMethod - FLAT_RATE or REDUCING_BALANCE
 * @param {number} params.termMonths - Duration in months
 * @param {string} params.repaymentFrequency - DAILY, WEEKLY, FORTNIGHTLY, MONTHLY
 * @param {number|string} [params.processingFeeRate=2.5] - % fee
 * @param {number|string} [params.insuranceFeeRate=1.0] - % fee
 * @param {Date|string} [params.startDate=new Date()] - Disbursement / start date
 */
export const calculateLoanDetails = ({
  principal,
  interestRate,
  interestMethod = 'FLAT_RATE',
  termMonths,
  repaymentFrequency = 'DAILY',
  processingFeeRate = 2.5,
  insuranceFeeRate = 1.0,
  startDate = new Date(),
  firstRepaymentDate = null,
}) => {
  const p = new Decimal(principal);
  const ratePct = new Decimal(interestRate); // monthly interest %
  const months = parseInt(termMonths, 10);
  const procRate = new Decimal(processingFeeRate);
  const insRate = new Decimal(insuranceFeeRate);

  if (p.lte(0)) throw new Error('Principal must be greater than zero');
  if (months <= 0) throw new Error('Term must be at least 1 month');

  // Calculate upfront deductions
  const processingFee = roundMoney(p.times(procRate).dividedBy(100));
  const insuranceFee = roundMoney(p.times(insRate).dividedBy(100));
  const totalFees = processingFee.plus(insuranceFee);
  const netDisbursement = roundMoney(p.minus(totalFees));

  // Determine number of installments based on frequency
  let numberOfInstallments = months;
  let intervalDays = 30;

  switch (repaymentFrequency) {
    case 'DAILY':
      numberOfInstallments = months * 22; // 22 working days per month standard
      intervalDays = 1;
      break;
    case 'WEEKLY':
      numberOfInstallments = months * 4;
      intervalDays = 7;
      break;
    case 'FORTNIGHTLY':
      numberOfInstallments = months * 2;
      intervalDays = 14;
      break;
    case 'MONTHLY':
    default:
      numberOfInstallments = months;
      intervalDays = 30;
      break;
  }

  const schedule = [];
  let totalInterest = new Decimal(0);
  let start = new Date(startDate);

  if (interestMethod === 'FLAT_RATE') {
    // Flat Rate calculation:
    // Total Interest = Principal * (Rate / 100) * Term in Months
    totalInterest = roundMoney(p.times(ratePct.dividedBy(100)).times(months));
    const totalRepayable = p.plus(totalInterest);

    const basePrincipalPerInstallment = p.dividedBy(numberOfInstallments);
    const baseInterestPerInstallment = totalInterest.dividedBy(numberOfInstallments);

    let accumulatedPrincipal = new Decimal(0);
    let accumulatedInterest = new Decimal(0);

    for (let i = 1; i <= numberOfInstallments; i++) {
      const isLast = i === numberOfInstallments;
      
      let installmentPrincipal = isLast
        ? p.minus(accumulatedPrincipal)
        : roundMoney(basePrincipalPerInstallment);

      let installmentInterest = isLast
        ? totalInterest.minus(accumulatedInterest)
        : roundMoney(baseInterestPerInstallment);

      accumulatedPrincipal = accumulatedPrincipal.plus(installmentPrincipal);
      accumulatedInterest = accumulatedInterest.plus(installmentInterest);

      const installmentTotal = installmentPrincipal.plus(installmentInterest);
      
      // Repayment installment due date starts from disbursement date or custom Super Admin date, automatically daily
      const dueDate = calculateInstallmentDueDate(start, i, repaymentFrequency, firstRepaymentDate);

      schedule.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString(),
        principalDue: installmentPrincipal.toNumber(),
        interestDue: installmentInterest.toNumber(),
        feesDue: 0,
        totalDue: installmentTotal.toNumber(),
        principalPaid: 0,
        interestPaid: 0,
        feesPaid: 0,
        totalPaid: 0,
        remainingBalance: installmentTotal.toNumber(),
        status: 'UPCOMING',
      });
    }
  } else {
    // REDUCING_BALANCE (Equal Installment Amortization)
    // Periodic rate r
    let periodicRate = ratePct.dividedBy(100);
    if (repaymentFrequency === 'WEEKLY') periodicRate = periodicRate.dividedBy(4);
    else if (repaymentFrequency === 'FORTNIGHTLY') periodicRate = periodicRate.dividedBy(2);
    else if (repaymentFrequency === 'DAILY') periodicRate = periodicRate.dividedBy(22);

    let pmt;
    if (periodicRate.eq(0)) {
      pmt = p.dividedBy(numberOfInstallments);
    } else {
      const onePlusRPowN = new Decimal(1).plus(periodicRate).pow(numberOfInstallments);
      pmt = p.times(periodicRate.times(onePlusRPowN)).dividedBy(onePlusRPowN.minus(1));
    }

    let remainingPrincipal = p;
    let accumulatedInterest = new Decimal(0);

    for (let i = 1; i <= numberOfInstallments; i++) {
      const isLast = i === numberOfInstallments;
      const interestForPeriod = roundMoney(remainingPrincipal.times(periodicRate));
      
      let principalForPeriod = isLast
        ? remainingPrincipal
        : roundMoney(pmt.minus(interestForPeriod));

      // Guard against overpaying principal
      if (principalForPeriod.gt(remainingPrincipal)) {
        principalForPeriod = remainingPrincipal;
      }

      const totalInstallment = principalForPeriod.plus(interestForPeriod);
      remainingPrincipal = remainingPrincipal.minus(principalForPeriod);
      accumulatedInterest = accumulatedInterest.plus(interestForPeriod);

      // Repayment installment due date starts from disbursement date or custom Super Admin date, automatically daily
      const dueDate = calculateInstallmentDueDate(start, i, repaymentFrequency, firstRepaymentDate);

      schedule.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString(),
        principalDue: principalForPeriod.toNumber(),
        interestDue: interestForPeriod.toNumber(),
        feesDue: 0,
        totalDue: totalInstallment.toNumber(),
        principalPaid: 0,
        interestPaid: 0,
        feesPaid: 0,
        totalPaid: 0,
        remainingBalance: totalInstallment.toNumber(),
        status: 'UPCOMING',
      });
    }

    totalInterest = roundMoney(accumulatedInterest);
  }

  const totalScheduledRepayment = roundMoney(p.plus(totalInterest));
  const maturityDate = schedule.length > 0 ? schedule[schedule.length - 1].dueDate : null;

  return {
    principal: p.toNumber(),
    approvedInterestRate: ratePct.toNumber(),
    interestMethod,
    repaymentFrequency,
    termMonths: months,
    numberOfInstallments,
    processingFee: processingFee.toNumber(),
    insuranceFee: insuranceFee.toNumber(),
    totalFees: totalFees.toNumber(),
    netDisbursement: netDisbursement.toNumber(),
    totalScheduledInterest: totalInterest.toNumber(),
    totalScheduledRepayment: totalScheduledRepayment.toNumber(),
    maturityDate,
    schedule,
  };
};

/**
 * Process a repayment amount through the loan's repayment schedules
 * Allocation order: Fees -> Interest -> Principal (standard prudential banking practice)
 * @param {Array} currentSchedules - List of existing schedule rows sorted by installmentNumber ASC
 * @param {number|string} paymentAmount - Amount paid by client
 */
export const allocateRepayment = (currentSchedules, paymentAmount) => {
  let unallocated = new Decimal(paymentAmount);
  if (unallocated.lte(0)) throw new Error('Payment amount must be greater than zero');

  let totalPrincipalComponent = new Decimal(0);
  let totalInterestComponent = new Decimal(0);
  let totalFeesComponent = new Decimal(0);

  const updatedSchedules = [];

  for (const item of currentSchedules) {
    if (unallocated.lte(0)) {
      // No more funds to allocate, copy remaining schedule as is
      updatedSchedules.push({ ...item });
      continue;
    }

    // Balances remaining on this installment
    const feesDueRemaining = new Decimal(item.feesDue).minus(item.feesPaid || 0);
    const interestDueRemaining = new Decimal(item.interestDue).minus(item.interestPaid || 0);
    const principalDueRemaining = new Decimal(item.principalDue).minus(item.principalPaid || 0);

    let thisFeesPaid = new Decimal(item.feesPaid || 0);
    let thisInterestPaid = new Decimal(item.interestPaid || 0);
    let thisPrincipalPaid = new Decimal(item.principalPaid || 0);

    // 1. Allocate to Fees
    if (feesDueRemaining.gt(0) && unallocated.gt(0)) {
      const payFees = Decimal.min(unallocated, feesDueRemaining);
      thisFeesPaid = thisFeesPaid.plus(payFees);
      totalFeesComponent = totalFeesComponent.plus(payFees);
      unallocated = unallocated.minus(payFees);
    }

    // 2. Allocate to Interest
    if (interestDueRemaining.gt(0) && unallocated.gt(0)) {
      const payInterest = Decimal.min(unallocated, interestDueRemaining);
      thisInterestPaid = thisInterestPaid.plus(payInterest);
      totalInterestComponent = totalInterestComponent.plus(payInterest);
      unallocated = unallocated.minus(payInterest);
    }

    // 3. Allocate to Principal
    if (principalDueRemaining.gt(0) && unallocated.gt(0)) {
      const payPrincipal = Decimal.min(unallocated, principalDueRemaining);
      thisPrincipalPaid = thisPrincipalPaid.plus(payPrincipal);
      totalPrincipalComponent = totalPrincipalComponent.plus(payPrincipal);
      unallocated = unallocated.minus(payPrincipal);
    }

    const totalInstallmentPaid = thisFeesPaid.plus(thisInterestPaid).plus(thisPrincipalPaid);
    const remainingBalance = new Decimal(item.totalDue).minus(totalInstallmentPaid);

    let status = item.status;
    if (remainingBalance.lte(0)) {
      status = 'PAID';
    } else if (totalInstallmentPaid.gt(0)) {
      status = 'PARTIALLY_PAID';
    }

    updatedSchedules.push({
      ...item,
      feesPaid: roundMoney(thisFeesPaid).toNumber(),
      interestPaid: roundMoney(thisInterestPaid).toNumber(),
      principalPaid: roundMoney(thisPrincipalPaid).toNumber(),
      totalPaid: roundMoney(totalInstallmentPaid).toNumber(),
      remainingBalance: roundMoney(Decimal.max(0, remainingBalance)).toNumber(),
      status,
      paidAt: status === 'PAID' ? new Date().toISOString() : item.paidAt,
    });
  }

  // If there is still excess funds after paying all scheduled installments, credit directly to principal
  if (unallocated.gt(0)) {
    totalPrincipalComponent = totalPrincipalComponent.plus(unallocated);
  }

  return {
    totalAllocated: roundMoney(new Decimal(paymentAmount)).toNumber(),
    principalComponent: roundMoney(totalPrincipalComponent).toNumber(),
    interestComponent: roundMoney(totalInterestComponent).toNumber(),
    feesComponent: roundMoney(totalFeesComponent).toNumber(),
    excessPrincipalCredited: roundMoney(unallocated).toNumber(),
    updatedSchedules,
  };
};

/**
 * Re-calculate current overall loan metrics from database records
 */
export const recalculateLoanBalances = (loan, allRepayments) => {
  const principal = new Decimal(loan.principalAmount);
  const totalInterest = new Decimal(loan.totalScheduledInterest);
  const totalFees = new Decimal(loan.totalFees || 0);

  let totalPrincipalPaid = new Decimal(0);
  let totalInterestPaid = new Decimal(0);
  let totalFeesPaid = new Decimal(0);

  for (const rep of allRepayments) {
    if (!rep.isReversed) {
      totalPrincipalPaid = totalPrincipalPaid.plus(rep.principalComponent || 0);
      totalInterestPaid = totalInterestPaid.plus(rep.interestComponent || 0);
      totalFeesPaid = totalFeesPaid.plus(rep.feesComponent || 0);
    }
  }

  const totalPaid = totalPrincipalPaid.plus(totalInterestPaid).plus(totalFeesPaid);

  const outstandingPrincipal = Decimal.max(0, principal.minus(totalPrincipalPaid));
  const outstandingInterest = Decimal.max(0, totalInterest.minus(totalInterestPaid));
  const outstandingFees = Decimal.max(0, totalFees.minus(totalFeesPaid));
  const totalOutstanding = outstandingPrincipal.plus(outstandingInterest).plus(outstandingFees);

  let status = loan.status;
  if (totalOutstanding.lte(0.01) && status === 'ACTIVE') {
    status = 'FULLY_PAID';
  }

  return {
    totalPrincipalPaid: roundMoney(totalPrincipalPaid).toNumber(),
    totalInterestPaid: roundMoney(totalInterestPaid).toNumber(),
    totalFeesPaid: roundMoney(totalFeesPaid).toNumber(),
    totalPaid: roundMoney(totalPaid).toNumber(),
    outstandingPrincipal: roundMoney(outstandingPrincipal).toNumber(),
    outstandingInterest: roundMoney(outstandingInterest).toNumber(),
    outstandingFees: roundMoney(outstandingFees).toNumber(),
    totalOutstanding: roundMoney(totalOutstanding).toNumber(),
    status,
  };
};

