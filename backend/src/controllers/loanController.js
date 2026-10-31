import prisma from '../config/prisma.js';
import { calculateLoanDetails } from '../services/financialEngine.js';
import { generateDisbursementVoucherPdf, generateClearanceCertificatePdf } from '../services/pdfService.js';
import { logAudit } from '../services/auditService.js';
import { ROLES } from '../config/constants.js';

/**
 * List loan applications with filters
 */
export const listApplications = async (req, res) => {
  try {
    const { status, clientId, officerId, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = parseInt(clientId, 10);
    if (officerId) where.assignedOfficerId = parseInt(officerId, 10);

    if (search) {
      where.OR = [
        { applicationNumber: { contains: search } },
        { client: { fullName: { contains: search } } },
        { client: { clientId: { contains: search } } },
      ];
    }

    const applications = await prisma.loanApplication.findMany({
      where,
      include: {
        client: true,
        product: true,
        createdByUser: { include: { staffProfile: true } },
        approvedByUser: { include: { staffProfile: true } },
        reviews: {
          include: { reviewer: { include: { staffProfile: true } } },
          orderBy: { createdAt: 'desc' },
        },
        loan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, count: applications.length, data: applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Submit a new loan application
 */
export const submitApplication = async (req, res) => {
  try {
    const {
      clientId,
      productId,
      requestedAmount,
      repaymentPeriodMonths,
      repaymentFrequency = 'MONTHLY',
      proposedInterestRate,
      monthlyIncome,
      affordabilityDetails,
      purpose,
      notes,
    } = req.body;

    if (!clientId || !productId || !requestedAmount || !repaymentPeriodMonths || !purpose) {
      return res.status(400).json({ success: false, message: 'Please provide all required application fields' });
    }

    const client = await prisma.client.findUnique({ where: { id: parseInt(clientId, 10) } });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    // Check if client has an existing active or overdue loan
    const existingActiveLoan = await prisma.loan.findFirst({
      where: {
        clientId: client.id,
        status: { in: ['ACTIVE', 'OVERDUE', 'AWAITING_DISBURSEMENT'] },
      },
    });

    if (existingActiveLoan) {
      return res.status(400).json({
        success: false,
        message: `Client already has an active loan (${existingActiveLoan.loanAccountNumber}). Clear existing facility before applying for a new loan.`,
      });
    }

    const product = await prisma.loanProduct.findUnique({ where: { id: parseInt(productId, 10) } });
    if (!product || !product.isActive) {
      return res.status(400).json({ success: false, message: 'Selected loan product is not active or invalid' });
    }

    const amount = parseFloat(requestedAmount);
    if (amount < Number(product.minAmount) || amount > Number(product.maxAmount)) {
      return res.status(400).json({
        success: false,
        message: `Requested amount must be between GH₵ ${product.minAmount} and GH₵ ${product.maxAmount} for ${product.name}`,
      });
    }

    // Auto application number: EF-APP-YEAR-XXXX
    const year = new Date().getFullYear();
    const appCount = await prisma.loanApplication.count();
    const applicationNumber = `EF-APP-${year}-${String(appCount + 1).padStart(4, '0')}`;

    // Fixed 10% interest rate policy
    const effectiveRate = 10.00;

    const application = await prisma.loanApplication.create({
      data: {
        applicationNumber,
        clientId: client.id,
        productId: product.id,
        requestedAmount: amount,
        repaymentPeriodMonths: parseInt(repaymentPeriodMonths, 10),
        repaymentFrequency,
        proposedInterestRate: effectiveRate,
        monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : 0,
        affordabilityDetails,
        purpose,
        notes,
        status: 'SUBMITTED',
        createdByUserId: req.user.id,
        assignedOfficerId: client.assignedOfficerId || req.user.id,
      },
      include: {
        client: true,
        product: true,
      },
    });

    await logAudit({
      action: 'SUBMIT_LOAN_APPLICATION',
      entityType: 'LoanApplication',
      entityId: application.id,
      details: { applicationNumber, clientId: client.clientId, amount },
      req,
    });

    return res.status(201).json({
      success: true,
      message: `Loan application ${applicationNumber} submitted successfully`,
      data: application,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Review / Approve / Reject loan application
 */
export const reviewApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, comments, approvedAmount, interestRate, termMonths, conditions } = req.body;

    const appId = parseInt(id, 10);
    const application = await prisma.loanApplication.findUnique({
      where: { id: appId },
      include: { client: true, product: true },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Prevent approving own loan application unless Super Admin
    if (application.createdByUserId === req.user.id && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Separation of duties violation: You cannot approve a loan application you submitted yourself.',
      });
    }

    // Only Super Admin or CEO can approve and determine the loan amount to be sent
    if (decision === 'APPROVED' && req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.CEO) {
      return res.status(403).json({
        success: false,
        message: 'Authorization restricted: Only the Super Administrator has authority to approve and determine the loan amount to be sent.',
      });
    }

    if (!['APPROVED', 'REJECTED', 'MORE_INFO_REQUIRED', 'UNDER_REVIEW'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Invalid decision type' });
    }

    let newStatus = decision;
    if (decision === 'APPROVED') {
      newStatus = 'APPROVED';
    }

    // Record review entry
    await prisma.loanApplicationReview.create({
      data: {
        applicationId: application.id,
        reviewerId: req.user.id,
        decision,
        comments: comments || '',
        approvedAmount: approvedAmount ? parseFloat(approvedAmount) : application.requestedAmount,
        interestRate: interestRate ? parseFloat(interestRate) : application.proposedInterestRate,
        termMonths: termMonths ? parseInt(termMonths, 10) : application.repaymentPeriodMonths,
        conditions: conditions || '',
      },
    });

    const updatePayload = {
      status: newStatus,
    };

    if (decision === 'APPROVED') {
      updatePayload.approvedAmount = approvedAmount ? parseFloat(approvedAmount) : application.requestedAmount;
      updatePayload.proposedInterestRate = interestRate ? parseFloat(interestRate) : application.proposedInterestRate;
      updatePayload.repaymentPeriodMonths = termMonths ? parseInt(termMonths, 10) : application.repaymentPeriodMonths;
      updatePayload.approvedByUserId = req.user.id;
      updatePayload.approvedAt = new Date();
    } else if (decision === 'REJECTED') {
      updatePayload.rejectionReason = comments || 'Credit criteria not met';
    }

    const updatedApp = await prisma.loanApplication.update({
      where: { id: application.id },
      data: updatePayload,
      include: { client: true, product: true },
    });

    await logAudit({
      action: `LOAN_APP_${decision}`,
      entityType: 'LoanApplication',
      entityId: application.id,
      details: { applicationNumber: application.applicationNumber, decision, comments, approvedAmount },
      req,
    });

    return res.json({
      success: true,
      message: `Application ${application.applicationNumber} has been updated to ${decision}`,
      data: updatedApp,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Preview loan calculation before disbursement
 */
export const previewCalculation = async (req, res) => {
  try {
    const { principal, interestRate, interestMethod, termMonths, repaymentFrequency, processingFeeRate, insuranceFeeRate } = req.body;
    
    const details = calculateLoanDetails({
      principal: parseFloat(principal),
      interestRate: parseFloat(interestRate),
      interestMethod,
      termMonths: parseInt(termMonths, 10),
      repaymentFrequency,
      processingFeeRate: processingFeeRate !== undefined ? parseFloat(processingFeeRate) : 2.5,
      insuranceFeeRate: insuranceFeeRate !== undefined ? parseFloat(insuranceFeeRate) : 1.0,
    });

    return res.json({ success: true, data: details });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Disburse Loan (Atomic Execution)
 */
export const disburseLoan = async (req, res) => {
  try {
    const {
      applicationId,
      paymentMethod = 'CASH',
      destinationAccount,
      transactionReference,
      cashAccountId,
      notes,
    } = req.body;

    const appId = parseInt(applicationId, 10);
    const application = await prisma.loanApplication.findUnique({
      where: { id: appId },
      include: { client: true, product: true },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Loan application not found' });
    }

    if (application.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: `Cannot disburse loan: Application status is currently ${application.status}. Only APPROVED applications can be disbursed.`,
      });
    }

    // Check if loan was already disbursed
    const existingLoan = await prisma.loan.findUnique({ where: { applicationId: application.id } });
    if (existingLoan) {
      return res.status(400).json({ success: false, message: 'Loan has already been originated and disbursed.' });
    }

    // Loan amount to be sent is determined by the Super Admin
    let approvedPrincipal = application.approvedAmount
      ? Number(application.approvedAmount)
      : Number(application.requestedAmount);

    // Super Admin can also adjust the exact loan amount sent at disbursement time
    if (req.body.disbursedAmount && (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.CEO)) {
      const customAmount = parseFloat(req.body.disbursedAmount);
      if (!isNaN(customAmount) && customAmount > 0) {
        approvedPrincipal = customAmount;
      }
    }
    const approvedRate = Number(application.proposedInterestRate || application.product.defaultInterestRate);
    const termMonths = application.repaymentPeriodMonths;
    const repaymentFrequency = application.repaymentFrequency;
    const interestMethod = application.product.interestMethod;

    // Check Super Admin Total Loan Capital Allocation limit
    const allocationSetting = await prisma.systemSetting.findUnique({
      where: { key: 'TOTAL_LOAN_ALLOCATION' },
    });
    if (allocationSetting && allocationSetting.value) {
      const totalAllocation = parseFloat(allocationSetting.value);
      if (!isNaN(totalAllocation) && totalAllocation > 0) {
        const currentDisbAgg = await prisma.loanDisbursement.aggregate({
          _sum: { grossPrincipal: true },
        });
        const currentDisbursed = Number(currentDisbAgg._sum.grossPrincipal || 0);
        if (currentDisbursed + approvedPrincipal > totalAllocation) {
          const availableBudget = Math.max(0, totalAllocation - currentDisbursed);
          return res.status(400).json({
            success: false,
            message: `Disbursement blocked: Loan of GH₵ ${approvedPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2 })} exceeds available lending allocation (GH₵ ${availableBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })} remaining of GH₵ ${totalAllocation.toLocaleString(undefined, { minimumFractionDigits: 2 })} total pool). Super Admin must allocate more lending capital.`,
          });
        }
      }
    }

    const calcResult = calculateLoanDetails({
      principal: approvedPrincipal,
      interestRate: approvedRate,
      interestMethod,
      termMonths,
      repaymentFrequency,
      processingFeeRate: Number(application.product.processingFeeRate),
      insuranceFeeRate: Number(application.product.insuranceFeeRate),
      startDate: new Date(),
    });

    const year = new Date().getFullYear();
    const loanCount = await prisma.loan.count();
    const loanAccountNumber = `EF-LN-${year}-${String(loanCount + 1).padStart(4, '0')}`;
    const disbRef = `EF-DISB-${year}-${String(loanCount + 1).padStart(4, '0')}`;

    // Perform database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Loan record
      const loan = await tx.loan.create({
        data: {
          loanAccountNumber,
          applicationId: application.id,
          clientId: application.clientId,
          productId: application.productId,
          branchId: application.client.branchId,
          principalAmount: calcResult.principal,
          approvedInterestRate: calcResult.approvedInterestRate,
          interestMethod,
          repaymentFrequency,
          termMonths: calcResult.termMonths,
          totalScheduledInterest: calcResult.totalScheduledInterest,
          totalFees: calcResult.totalFees,
          totalScheduledRepayment: calcResult.totalScheduledRepayment,
          outstandingPrincipal: calcResult.principal,
          outstandingInterest: calcResult.totalScheduledInterest,
          outstandingFees: 0.00,
          totalOutstanding: calcResult.totalScheduledRepayment,
          status: 'ACTIVE',
          disbursedAt: new Date(),
          maturityDate: calcResult.maturityDate ? new Date(calcResult.maturityDate) : null,
          nextPaymentDate: calcResult.schedule.length > 0 ? new Date(calcResult.schedule[0].dueDate) : null,
          nextAmountDue: calcResult.schedule.length > 0 ? calcResult.schedule[0].totalDue : 0,
          assignedOfficerId: application.assignedOfficerId,
        },
      });

      // 2. Generate Repayment Schedules
      for (const item of calcResult.schedule) {
        await tx.repaymentSchedule.create({
          data: {
            loanId: loan.id,
            installmentNumber: item.installmentNumber,
            dueDate: new Date(item.dueDate),
            principalDue: item.principalDue,
            interestDue: item.interestDue,
            feesDue: item.feesDue,
            totalDue: item.totalDue,
            principalPaid: 0,
            interestPaid: 0,
            feesPaid: 0,
            totalPaid: 0,
            remainingBalance: item.remainingBalance,
            status: 'UPCOMING',
          },
        });
      }

      // 3. Create Disbursement Record
      const disbursement = await tx.loanDisbursement.create({
        data: {
          disbursementReference: disbRef,
          loanId: loan.id,
          clientId: application.clientId,
          grossPrincipal: calcResult.principal,
          processingFeeDeduction: calcResult.processingFee,
          insuranceFeeDeduction: calcResult.insuranceFee,
          otherDeductions: 0,
          netDisbursedAmount: calcResult.netDisbursement,
          paymentMethod,
          destinationAccount: destinationAccount || 'Over-the-counter Cash',
          transactionReference: transactionReference || 'Cash Disbursed',
          preparedByUserId: application.createdByUserId,
          authorizedByUserId: application.approvedByUserId || req.user.id,
          disbursedByUserId: req.user.id,
          notes,
          disbursedAt: new Date(),
        },
      });

      // 4. Update Application status
      await tx.loanApplication.update({
        where: { id: application.id },
        data: { status: 'DISBURSED' },
      });

      // 5. Post to Cash Account & Financial Transactions
      if (cashAccountId) {
        await tx.cashAccount.update({
          where: { id: parseInt(cashAccountId, 10) },
          data: {
            currentBalance: { decrement: calcResult.netDisbursement },
          },
        });
      }

      await tx.financialTransaction.create({
        data: {
          reference: `EF-TXN-${disbRef}`,
          type: 'DISBURSEMENT',
          amount: calcResult.netDisbursement,
          creditAccountId: cashAccountId ? parseInt(cashAccountId, 10) : null,
          loanId: loan.id,
          description: `Loan disbursement for ${loanAccountNumber} to client ${application.client.fullName} (Gross: GH₵ ${calcResult.principal}, Net: GH₵ ${calcResult.netDisbursement})`,
          performedByUserId: req.user.id,
        },
      });

      // 6. Notify Client
      if (application.client.userId) {
        await tx.notification.create({
          data: {
            userId: application.client.userId,
            title: 'Loan Disbursed',
            message: `Your loan ${loanAccountNumber} of GH₵ ${calcResult.principal} has been disbursed. Net payout: GH₵ ${calcResult.netDisbursement}.`,
            type: 'SUCCESS',
          },
        });
      }

      return { loan, disbursement };
    });

    // Generate disbursement voucher PDF asynchronously
    let voucherInfo = null;
    try {
      voucherInfo = await generateDisbursementVoucherPdf({
        disbursementReference: disbRef,
        disbursedAt: new Date(),
        clientName: application.client.fullName,
        clientId: application.client.clientId,
        ghanaCardNumber: application.client.ghanaCardNumber,
        phone: application.client.phone,
        loanAccountNumber,
        productName: application.product.name,
        termMonths: calcResult.termMonths,
        repaymentFrequency,
        approvedInterestRate: calcResult.approvedInterestRate,
        interestMethod,
        grossPrincipal: calcResult.principal,
        processingFeeDeduction: calcResult.processingFee,
        insuranceFeeDeduction: calcResult.insuranceFee,
        otherDeductions: 0,
        netDisbursedAmount: calcResult.netDisbursement,
        paymentMethod,
        destinationAccount,
        transactionReference,
        preparedByName: application.client.assignedOfficer?.staffProfile?.fullName || 'Loan Officer',
        authorizedByName: req.user.staffProfile?.fullName || 'Super Admin',
        disbursedByName: req.user.staffProfile?.fullName || req.user.username,
      });

      await prisma.loanDisbursement.update({
        where: { id: result.disbursement.id },
        data: { voucherUrl: voucherInfo.relativeUrl },
      });
    } catch (pdfErr) {
      console.error('Voucher PDF generation error:', pdfErr.message);
    }

    await logAudit({
      action: 'LOAN_DISBURSED',
      entityType: 'Loan',
      entityId: result.loan.id,
      details: {
        loanAccountNumber,
        disbursementReference: disbRef,
        grossPrincipal: calcResult.principal,
        netDisbursedAmount: calcResult.netDisbursement,
      },
      req,
    });

    return res.status(201).json({
      success: true,
      message: `Loan ${loanAccountNumber} successfully disbursed!`,
      data: {
        loan: result.loan,
        disbursement: result.disbursement,
        voucherUrl: voucherInfo?.relativeUrl || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List all active/historical loans
 */
export const listLoans = async (req, res) => {
  try {
    const { status, clientId, officerId, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = parseInt(clientId, 10);
    if (officerId) where.assignedOfficerId = parseInt(officerId, 10);

    if (search) {
      where.OR = [
        { loanAccountNumber: { contains: search } },
        { client: { fullName: { contains: search } } },
        { client: { clientId: { contains: search } } },
      ];
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        client: true,
        product: true,
        disbursement: true,
        repayments: {
          where: { isReversed: false },
          orderBy: { paymentDate: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, count: loans.length, data: loans });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get detailed loan profile including schedules and repayments
 */
export const getLoanDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await prisma.loan.findFirst({
      where: {
        OR: [
          { id: !isNaN(id) ? parseInt(id, 10) : -1 },
          { loanAccountNumber: id },
        ],
      },
      include: {
        client: {
          include: { guarantors: true, branch: true },
        },
        product: true,
        disbursement: {
          include: {
            preparedByUser: { include: { staffProfile: true } },
            authorizedByUser: { include: { staffProfile: true } },
            disbursedByUser: { include: { staffProfile: true } },
          },
        },
        repaymentSchedules: {
          orderBy: { installmentNumber: 'asc' },
        },
        repayments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            cashier: { include: { staffProfile: true } },
            reversal: true,
          },
        },
        followUps: {
          include: { officer: { include: { staffProfile: true } } },
          orderBy: { followUpDate: 'desc' },
        },
      },
    });

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    return res.json({ success: true, data: loan });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generate Clearance Certificate when loan is fully paid
 */
export const getClearanceCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(id, 10) },
      include: { client: true },
    });

    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    if (loan.status !== 'FULLY_PAID' && Number(loan.totalOutstanding) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Cannot issue Clearance Certificate: This loan has not been fully settled.',
      });
    }

    const cert = await generateClearanceCertificatePdf({
      loanAccountNumber: loan.loanAccountNumber,
      clientName: loan.client.fullName,
      clientId: loan.client.clientId,
      ghanaCardNumber: loan.client.ghanaCardNumber,
      principalAmount: loan.principalAmount,
      clearedDate: loan.updatedAt,
    });

    return res.json({ success: true, data: cert });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

