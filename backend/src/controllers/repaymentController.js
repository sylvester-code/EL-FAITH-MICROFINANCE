import prisma from '../config/prisma.js';
import { allocateRepayment, recalculateLoanBalances } from '../services/financialEngine.js';
import { generateReceiptPdf } from '../services/pdfService.js';
import { logAudit } from '../services/auditService.js';
import { ROLES } from '../config/constants.js';

/**
 * Record a loan repayment
 */
export const recordRepayment = async (req, res) => {
  try {
    const {
      loanId,
      amount,
      paymentMethod = 'CASH',
      transactionReference,
      cashAccountId,
      notes,
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount. Must be greater than 0.' });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId, 10) },
      include: {
        client: true,
        repaymentSchedules: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    if (loan.status === 'FULLY_PAID' || loan.status === 'CLOSED') {
      return res.status(400).json({ success: false, message: `Loan is already ${loan.status}. No outstanding balance.` });
    }

    // Process repayment through the financial allocation waterfall
    const allocation = allocateRepayment(loan.repaymentSchedules, parsedAmount);

    const year = new Date().getFullYear();
    const repCount = await prisma.repayment.count();
    const receiptNumber = `EF-REC-${year}-${String(repCount + 1).padStart(5, '0')}`;
    const paymentRef = `EF-PAY-${year}-${Date.now().toString().slice(-6)}`;

    // Database transaction to record payment and update schedule
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update schedule rows
      for (const item of allocation.updatedSchedules) {
        await tx.repaymentSchedule.update({
          where: { id: item.id },
          data: {
            principalPaid: item.principalPaid,
            interestPaid: item.interestPaid,
            feesPaid: item.feesPaid,
            totalPaid: item.totalPaid,
            remainingBalance: item.remainingBalance,
            status: item.status,
            paidAt: item.paidAt ? new Date(item.paidAt) : null,
          },
        });
      }

      // 2. Fetch all valid repayments including this new one to accurately recalculate loan
      const newRepayment = await tx.repayment.create({
        data: {
          receiptNumber,
          loanId: loan.id,
          clientId: loan.clientId,
          paymentReference: paymentRef,
          amountPaid: parsedAmount,
          paymentMethod,
          transactionReference,
          principalComponent: allocation.principalComponent,
          interestComponent: allocation.interestComponent,
          feesComponent: allocation.feesComponent,
          outstandingBalanceAfter: 0, // will update immediately below
          receivingCashierId: req.user.id,
          notes,
          paymentDate: new Date(),
        },
      });

      const allActiveRepayments = await tx.repayment.findMany({
        where: { loanId: loan.id, isReversed: false },
      });

      const updatedBalances = recalculateLoanBalances(loan, allActiveRepayments);

      // Update remaining balance on repayment record
      await tx.repayment.update({
        where: { id: newRepayment.id },
        data: { outstandingBalanceAfter: updatedBalances.totalOutstanding },
      });

      // 3. Find next due installment for loan header
      const nextSchedule = allocation.updatedSchedules.find((s) => s.status !== 'PAID');

      // 4. Update the Loan master record
      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          totalPrincipalPaid: updatedBalances.totalPrincipalPaid,
          totalInterestPaid: updatedBalances.totalInterestPaid,
          totalFeesPaid: updatedBalances.totalFeesPaid,
          totalPaid: updatedBalances.totalPaid,
          outstandingPrincipal: updatedBalances.outstandingPrincipal,
          outstandingInterest: updatedBalances.outstandingInterest,
          outstandingFees: updatedBalances.outstandingFees,
          totalOutstanding: updatedBalances.totalOutstanding,
          status: updatedBalances.status,
          nextPaymentDate: nextSchedule ? new Date(nextSchedule.dueDate) : null,
          nextAmountDue: nextSchedule ? nextSchedule.remainingBalance : 0,
        },
      });

      // 5. Post to Cash Account & Financial Transaction Ledger
      if (cashAccountId) {
        await tx.cashAccount.update({
          where: { id: parseInt(cashAccountId, 10) },
          data: {
            currentBalance: { increment: parsedAmount },
          },
        });
      }

      await tx.financialTransaction.create({
        data: {
          reference: `EF-TXN-${receiptNumber}`,
          type: 'REPAYMENT',
          amount: parsedAmount,
          debitAccountId: cashAccountId ? parseInt(cashAccountId, 10) : null,
          loanId: loan.id,
          repaymentId: newRepayment.id,
          description: `Repayment received for Loan ${loan.loanAccountNumber} from ${loan.client.fullName} (Principal: GH₵ ${allocation.principalComponent}, Interest: GH₵ ${allocation.interestComponent})`,
          performedByUserId: req.user.id,
        },
      });

      return {
        repayment: { ...newRepayment, outstandingBalanceAfter: updatedBalances.totalOutstanding },
        updatedLoan,
      };
    });

    // Generate PDF receipt asynchronously
    let pdfReceipt = null;
    try {
      pdfReceipt = await generateReceiptPdf({
        receiptNumber,
        paymentDate: result.repayment.paymentDate,
        clientName: loan.client.fullName,
        clientId: loan.client.clientId,
        loanAccountNumber: loan.loanAccountNumber,
        paymentMethod,
        transactionReference,
        cashierName: req.user.staffProfile?.fullName || req.user.username,
        principalComponent: allocation.principalComponent,
        interestComponent: allocation.interestComponent,
        feesComponent: allocation.feesComponent,
        amountPaid: parsedAmount,
        outstandingBalanceAfter: result.repayment.outstandingBalanceAfter,
      });

      await prisma.repayment.update({
        where: { id: result.repayment.id },
        data: { receiptPdfUrl: pdfReceipt.relativeUrl },
      });
    } catch (pdfErr) {
      console.error('Receipt PDF generation error:', pdfErr.message);
    }

    await logAudit({
      action: 'REPAYMENT_RECORDED',
      entityType: 'Repayment',
      entityId: result.repayment.id,
      details: {
        receiptNumber,
        loanAccountNumber: loan.loanAccountNumber,
        amountPaid: parsedAmount,
        principalComponent: allocation.principalComponent,
        interestComponent: allocation.interestComponent,
        outstandingAfter: result.repayment.outstandingBalanceAfter,
      },
      req,
    });

    return res.status(201).json({
      success: true,
      message: `Repayment of GH₵ ${parsedAmount.toFixed(2)} recorded successfully. Receipt No: ${receiptNumber}`,
      data: {
        receiptNumber,
        repayment: result.repayment,
        loan: result.updatedLoan,
        receiptPdfUrl: pdfReceipt?.relativeUrl || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Request payment reversal (Cannot delete payment - preserves full audit trail)
 */
export const requestReversal = async (req, res) => {
  try {
    const { repaymentId, reason } = req.body;

    if (!repaymentId || !reason) {
      return res.status(400).json({ success: false, message: 'Repayment ID and reason are required' });
    }

    const rep = await prisma.repayment.findUnique({
      where: { id: parseInt(repaymentId, 10) },
      include: { loan: true },
    });

    if (!rep) return res.status(404).json({ success: false, message: 'Repayment record not found' });
    if (rep.isReversed) return res.status(400).json({ success: false, message: 'This repayment has already been reversed' });

    const existingRequest = await prisma.transactionReversal.findUnique({
      where: { originalRepaymentId: rep.id },
    });

    if (existingRequest && existingRequest.status === 'PENDING') {
      return res.status(400).json({ success: false, message: 'A reversal request is already pending review for this receipt' });
    }

    const reversal = await prisma.transactionReversal.create({
      data: {
        originalRepaymentId: rep.id,
        reason,
        requestedByUserId: req.user.id,
        status: 'PENDING',
      },
    });

    await logAudit({
      action: 'REVERSAL_REQUESTED',
      entityType: 'TransactionReversal',
      entityId: reversal.id,
      details: { receiptNumber: rep.receiptNumber, amount: rep.amountPaid, reason },
      req,
    });

    return res.status(201).json({
      success: true,
      message: `Reversal request submitted for receipt ${rep.receiptNumber}. Awaiting authorization.`,
      data: reversal,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve payment reversal (Manager / Super Admin)
 */
export const approveReversal = async (req, res) => {
  try {
    const { reversalId, decision } = req.body; // 'APPROVED' or 'REJECTED'

    const revId = parseInt(reversalId, 10);
    const reversal = await prisma.transactionReversal.findUnique({
      where: { id: revId },
      include: {
        repayment: {
          include: { loan: { include: { repaymentSchedules: { orderBy: { installmentNumber: 'asc' } } } } },
        },
      },
    });

    if (!reversal) return res.status(404).json({ success: false, message: 'Reversal request not found' });
    if (reversal.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Reversal already decided: ${reversal.status}` });
    }

    if (decision === 'REJECTED') {
      await prisma.transactionReversal.update({
        where: { id: revId },
        data: { status: 'REJECTED', approvedByUserId: req.user.id, approvedAt: new Date() },
      });
      return res.json({ success: true, message: 'Reversal request rejected' });
    }

    // Execute Reversal:
    // Mark repayment as reversed
    // Recalculate schedule allocations and master loan balances
    await prisma.$transaction(async (tx) => {
      await tx.transactionReversal.update({
        where: { id: revId },
        data: {
          status: 'APPROVED',
          approvedByUserId: req.user.id,
          approvedAt: new Date(),
        },
      });

      await tx.repayment.update({
        where: { id: reversal.originalRepaymentId },
        data: {
          isReversed: true,
          reversalReason: reversal.reason,
          reversedAt: new Date(),
          reversedByUserId: req.user.id,
        },
      });

      const loan = reversal.repayment.loan;

      // Re-run all active repayments across original schedules from scratch to rebuild schedule balances
      const activeRepayments = await tx.repayment.findMany({
        where: { loanId: loan.id, isReversed: false },
        orderBy: { paymentDate: 'asc' },
      });

      // Reset schedules to 0 paid
      for (const sched of loan.repaymentSchedules) {
        await tx.repaymentSchedule.update({
          where: { id: sched.id },
          data: {
            principalPaid: 0,
            interestPaid: 0,
            feesPaid: 0,
            totalPaid: 0,
            remainingBalance: sched.totalDue,
            status: 'UPCOMING',
            paidAt: null,
          },
        });
      }

      // Re-apply remaining active repayments sequentially
      let currentSchedules = await tx.repaymentSchedule.findMany({
        where: { loanId: loan.id },
        orderBy: { installmentNumber: 'asc' },
      });

      for (const rep of activeRepayments) {
        const alloc = allocateRepayment(currentSchedules, Number(rep.amountPaid));
        for (const item of alloc.updatedSchedules) {
          await tx.repaymentSchedule.update({
            where: { id: item.id },
            data: {
              principalPaid: item.principalPaid,
              interestPaid: item.interestPaid,
              feesPaid: item.feesPaid,
              totalPaid: item.totalPaid,
              remainingBalance: item.remainingBalance,
              status: item.status,
              paidAt: item.paidAt ? new Date(item.paidAt) : null,
            },
          });
        }
        currentSchedules = alloc.updatedSchedules;
      }

      // Re-calculate master loan
      const updatedBalances = recalculateLoanBalances(loan, activeRepayments);
      const nextSchedule = currentSchedules.find((s) => s.status !== 'PAID');

      await tx.loan.update({
        where: { id: loan.id },
        data: {
          totalPrincipalPaid: updatedBalances.totalPrincipalPaid,
          totalInterestPaid: updatedBalances.totalInterestPaid,
          totalFeesPaid: updatedBalances.totalFeesPaid,
          totalPaid: updatedBalances.totalPaid,
          outstandingPrincipal: updatedBalances.outstandingPrincipal,
          outstandingInterest: updatedBalances.outstandingInterest,
          outstandingFees: updatedBalances.outstandingFees,
          totalOutstanding: updatedBalances.totalOutstanding,
          status: updatedBalances.status,
          nextPaymentDate: nextSchedule ? new Date(nextSchedule.dueDate) : null,
          nextAmountDue: nextSchedule ? nextSchedule.remainingBalance : 0,
        },
      });

      // Log reversal financial transaction
      await tx.financialTransaction.create({
        data: {
          reference: `EF-REV-${reversal.repayment.receiptNumber}`,
          type: 'REVERSAL',
          amount: reversal.repayment.amountPaid,
          loanId: loan.id,
          repaymentId: reversal.originalRepaymentId,
          description: `Authorized payment reversal for Receipt ${reversal.repayment.receiptNumber}: ${reversal.reason}`,
          performedByUserId: req.user.id,
        },
      });
    });

    await logAudit({
      action: 'REVERSAL_APPROVED',
      entityType: 'Repayment',
      entityId: reversal.originalRepaymentId,
      details: { receiptNumber: reversal.repayment.receiptNumber, amount: reversal.repayment.amountPaid },
      req,
    });

    return res.json({
      success: true,
      message: `Reversal for receipt ${reversal.repayment.receiptNumber} approved. Balances restored.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List repayments with search and filters
 */
export const listRepayments = async (req, res) => {
  try {
    const { loanId, clientId, cashierId, startDate, endDate, isReversed } = req.query;

    const where = {};
    if (loanId) where.loanId = parseInt(loanId, 10);
    if (clientId) where.clientId = parseInt(clientId, 10);
    if (cashierId) where.receivingCashierId = parseInt(cashierId, 10);
    if (isReversed !== undefined) where.isReversed = isReversed === 'true';

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const repayments = await prisma.repayment.findMany({
      where,
      include: {
        loan: { select: { loanAccountNumber: true, principalAmount: true, totalOutstanding: true } },
        client: { select: { id: true, clientId: true, fullName: true, phone: true, communityTown: true } },
        cashier: { select: { id: true, username: true, staffId: true, role: true, staffProfile: { select: { fullName: true } } } },
        reversal: true,
      },
      orderBy: { paymentDate: 'desc' },
      take: 100,
    });

    return res.json({ success: true, count: repayments.length, data: repayments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

