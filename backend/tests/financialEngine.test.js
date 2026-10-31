import test from 'node:test';
import assert from 'node:assert/strict';
import {
  roundMoney,
  calculateLoanDetails,
  allocateRepayment,
  recalculateLoanBalances,
} from '../src/services/financialEngine.js';

test('Financial Engine - Flat Rate Loan Calculation & Rounding', () => {
  const principal = 10000;
  const rate = 10; // 10% monthly
  const term = 6; // 6 months

  const result = calculateLoanDetails({
    principal,
    interestRate: rate,
    interestMethod: 'FLAT_RATE',
    termMonths: term,
    repaymentFrequency: 'MONTHLY',
    processingFeeRate: 2.5,
    insuranceFeeRate: 1.0,
  });

  // Flat Interest = 10,000 * 0.10 * 6 = 6,000
  assert.equal(result.totalScheduledInterest, 6000.00);
  assert.equal(result.totalScheduledRepayment, 16000.00);
  assert.equal(result.processingFee, 250.00);
  assert.equal(result.insuranceFee, 100.00);
  assert.equal(result.totalFees, 350.00);
  assert.equal(result.netDisbursement, 9650.00);

  // Installments sum must equal totalScheduledRepayment exactly
  const sumInstallments = result.schedule.reduce((acc, curr) => acc + curr.totalDue, 0);
  assert.equal(roundMoney(sumInstallments).toNumber(), 16000.00);
  assert.equal(result.schedule.length, 6);

  // Verify first repayment date starts 1 week (7 days) after disbursement
  const expectedFirstDueDate = new Date();
  expectedFirstDueDate.setDate(expectedFirstDueDate.getDate() + 7);
  const actualFirstDueDate = new Date(result.schedule[0].dueDate);
  assert.equal(actualFirstDueDate.toDateString(), expectedFirstDueDate.toDateString());
});

test('Financial Engine - Reducing Balance Loan Calculation', () => {
  const principal = 5000;
  const rate = 5; // 5% monthly
  const term = 4; // 4 months

  const result = calculateLoanDetails({
    principal,
    interestRate: rate,
    interestMethod: 'REDUCING_BALANCE',
    termMonths: term,
    repaymentFrequency: 'MONTHLY',
  });

  // Principal sum across installments must equal original principal exactly
  const sumPrincipal = result.schedule.reduce((acc, curr) => acc + curr.principalDue, 0);
  assert.equal(roundMoney(sumPrincipal).toNumber(), 5000.00);
  assert.equal(result.schedule.length, 4);
});

test('Financial Engine - Weekly Repayment Frequency', () => {
  const principal = 2000;
  const rate = 8;
  const term = 2; // 2 months => 8 weeks

  const result = calculateLoanDetails({
    principal,
    interestRate: rate,
    interestMethod: 'FLAT_RATE',
    termMonths: term,
    repaymentFrequency: 'WEEKLY',
  });

  assert.equal(result.numberOfInstallments, 8);
  assert.equal(result.schedule.length, 8);
  const sumInstallments = result.schedule.reduce((acc, curr) => acc + curr.totalDue, 0);
  assert.equal(roundMoney(sumInstallments).toNumber(), result.totalScheduledRepayment);
});

test('Financial Engine - Repayment Allocation (Fees -> Interest -> Principal Waterfall)', () => {
  const mockSchedules = [
    {
      id: 1,
      installmentNumber: 1,
      totalDue: 1000,
      feesDue: 50,
      feesPaid: 0,
      interestDue: 350,
      interestPaid: 0,
      principalDue: 600,
      principalPaid: 0,
      remainingBalance: 1000,
      status: 'UPCOMING',
    },
    {
      id: 2,
      installmentNumber: 2,
      totalDue: 1000,
      feesDue: 0,
      feesPaid: 0,
      interestDue: 350,
      interestPaid: 0,
      principalDue: 650,
      principalPaid: 0,
      remainingBalance: 1000,
      status: 'UPCOMING',
    },
  ];

  // 1. Partial payment of 200: pays 50 fees + 150 interest
  const alloc1 = allocateRepayment(mockSchedules, 200);
  assert.equal(alloc1.feesComponent, 50);
  assert.equal(alloc1.interestComponent, 150);
  assert.equal(alloc1.principalComponent, 0);
  assert.equal(alloc1.updatedSchedules[0].remainingBalance, 800);
  assert.equal(alloc1.updatedSchedules[0].status, 'PARTIALLY_PAID');

  // 2. Full installment payment of 1000: pays 50 fees, 350 interest, 600 principal
  const alloc2 = allocateRepayment(mockSchedules, 1000);
  assert.equal(alloc2.feesComponent, 50);
  assert.equal(alloc2.interestComponent, 350);
  assert.equal(alloc2.principalComponent, 600);
  assert.equal(alloc2.updatedSchedules[0].remainingBalance, 0);
  assert.equal(alloc2.updatedSchedules[0].status, 'PAID');

  // 3. Excess payment of 1500: pays installment 1 full, then spills into installment 2
  const alloc3 = allocateRepayment(mockSchedules, 1500);
  assert.equal(alloc3.feesComponent, 50);
  assert.equal(alloc3.interestComponent, 700); // 350 from inst 1 + 350 from inst 2
  assert.equal(alloc3.principalComponent, 750); // 600 from inst 1 + 150 from inst 2
  assert.equal(alloc3.updatedSchedules[0].status, 'PAID');
  assert.equal(alloc3.updatedSchedules[1].status, 'PARTIALLY_PAID');
  assert.equal(alloc3.updatedSchedules[1].remainingBalance, 500);
});

test('Financial Engine - Reversals and Master Loan Recalculation', () => {
  const loan = {
    principalAmount: 10000,
    totalScheduledInterest: 6000,
    totalFees: 350,
    status: 'ACTIVE',
  };

  const activeRepayments = [
    { principalComponent: 1666.67, interestComponent: 1000, feesComponent: 58.33, isReversed: false },
    { principalComponent: 1666.67, interestComponent: 1000, feesComponent: 58.33, isReversed: false },
    { principalComponent: 500.00, interestComponent: 300, feesComponent: 0, isReversed: true }, // reversed, should not count
  ];

  const recalculated = recalculateLoanBalances(loan, activeRepayments);
  assert.equal(recalculated.totalPrincipalPaid, 3333.34);
  assert.equal(recalculated.totalInterestPaid, 2000.00);
  assert.equal(recalculated.totalFeesPaid, 116.66);
  assert.equal(recalculated.outstandingPrincipal, 6666.66);
  assert.equal(recalculated.outstandingInterest, 4000.00);
  assert.equal(recalculated.status, 'ACTIVE');
});

