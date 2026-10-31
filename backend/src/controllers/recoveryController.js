import prisma from '../config/prisma.js';
import { logAudit } from '../services/auditService.js';

/**
 * Get overdue and at-risk loans
 */
export const getOverdueLoans = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update overdue flags on schedules and loans
    const overdueSchedules = await prisma.repaymentSchedule.findMany({
      where: {
        dueDate: { lt: today },
        status: { in: ['UPCOMING', 'PARTIALLY_PAID'] },
      },
      include: {
        loan: {
          include: {
            client: true,
            product: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Group schedules by loan
    const loanMap = new Map();

    for (const sched of overdueSchedules) {
      const loan = sched.loan;
      const daysOverdue = Math.floor((today.getTime() - new Date(sched.dueDate).getTime()) / (1000 * 3600 * 24));

      if (!loanMap.has(loan.id)) {
        loanMap.set(loan.id, {
          loanId: loan.id,
          loanAccountNumber: loan.loanAccountNumber,
          clientName: loan.client.fullName,
          clientId: loan.client.clientId,
          clientPhone: loan.client.phone,
          clientAltPhone: loan.client.altPhone,
          communityTown: loan.client.communityTown,
          residentialAddress: loan.client.residentialAddress,
          productName: loan.product.name,
          principalAmount: loan.principalAmount,
          totalOutstanding: loan.totalOutstanding,
          overdueInstallmentsCount: 0,
          totalOverdueArrears: 0,
          maxDaysOverdue: daysOverdue,
          earliestDueDate: sched.dueDate,
          schedules: [],
        });
      }

      const existing = loanMap.get(loan.id);
      existing.overdueInstallmentsCount += 1;
      existing.totalOverdueArrears += Number(sched.remainingBalance);
      if (daysOverdue > existing.maxDaysOverdue) {
        existing.maxDaysOverdue = daysOverdue;
      }
      existing.schedules.push({
        installmentNumber: sched.installmentNumber,
        dueDate: sched.dueDate,
        totalDue: sched.totalDue,
        remainingBalance: sched.remainingBalance,
        daysOverdue,
      });
    }

    const overdueList = Array.from(loanMap.values()).sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue);

    return res.json({
      success: true,
      count: overdueList.length,
      data: overdueList,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Log follow-up activity / recovery call / visit
 */
export const logFollowUp = async (req, res) => {
  try {
    const { clientId, loanId, interactionType, notes, promisedPaymentDate, promisedAmount, outcome } = req.body;

    if (!clientId || !interactionType || !notes) {
      return res.status(400).json({ success: false, message: 'Client ID, interaction type, and notes are required' });
    }

    const followUp = await prisma.followUpActivity.create({
      data: {
        clientId: parseInt(clientId, 10),
        loanId: loanId ? parseInt(loanId, 10) : null,
        officerId: req.user.id,
        interactionType,
        notes: notes.trim(),
        promisedPaymentDate: promisedPaymentDate ? new Date(promisedPaymentDate) : null,
        promisedAmount: promisedAmount ? parseFloat(promisedAmount) : null,
        outcome: outcome || 'Follow-up completed',
        followUpDate: new Date(),
      },
      include: {
        officer: { select: { username: true, staffProfile: { select: { fullName: true } } } },
      },
    });

    await logAudit({
      action: 'LOG_FOLLOW_UP',
      entityType: 'FollowUpActivity',
      entityId: followUp.id,
      details: { clientId, loanId, interactionType, outcome, promisedAmount },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Recovery and follow-up interaction recorded',
      data: followUp,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get follow-up activities history for a client or loan
 */
export const getFollowUps = async (req, res) => {
  try {
    const { clientId, loanId } = req.query;
    const where = {};
    if (clientId) where.clientId = parseInt(clientId, 10);
    if (loanId) where.loanId = parseInt(loanId, 10);

    const logs = await prisma.followUpActivity.findMany({
      where,
      include: {
        officer: { select: { username: true, staffProfile: { select: { fullName: true } } } },
        client: { select: { fullName: true, clientId: true, phone: true } },
      },
      orderBy: { followUpDate: 'desc' },
      take: 50,
    });

    return res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

