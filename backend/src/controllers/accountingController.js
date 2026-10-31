import prisma from '../config/prisma.js';
import { logAudit } from '../services/auditService.js';

/**
 * Get Cashbook summary and transaction log
 */
export const getCashbook = async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

    // Calculate opening balance before the start date
    const priorTransactions = await prisma.financialTransaction.findMany({
      where: {
        timestamp: { lt: start },
        ...(accountId ? {
          OR: [{ debitAccountId: parseInt(accountId, 10) }, { creditAccountId: parseInt(accountId, 10) }],
        } : {}),
      },
    });

    let openingBalance = 0;
    for (const txn of priorTransactions) {
      if (['REPAYMENT', 'CASH_DEPOSIT', 'FEE_COLLECTION'].includes(txn.type)) {
        openingBalance += Number(txn.amount);
      } else if (['DISBURSEMENT', 'EXPENSE', 'CASH_WITHDRAWAL'].includes(txn.type)) {
        openingBalance -= Number(txn.amount);
      }
    }

    // Transactions within selected range
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        timestamp: { gte: start, lte: end },
        ...(accountId ? {
          OR: [{ debitAccountId: parseInt(accountId, 10) }, { creditAccountId: parseInt(accountId, 10) }],
        } : {}),
      },
      include: {
        debitAccount: true,
        creditAccount: true,
        performedByUser: {
          select: { username: true, staffProfile: { select: { fullName: true } } },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    let totalIn = 0;
    let totalOut = 0;

    const formattedTxns = transactions.map((t) => {
      const isIn = ['REPAYMENT', 'CASH_DEPOSIT', 'FEE_COLLECTION'].includes(t.type);
      const isOut = ['DISBURSEMENT', 'EXPENSE', 'CASH_WITHDRAWAL'].includes(t.type);
      const amount = Number(t.amount);

      if (isIn) totalIn += amount;
      if (isOut) totalOut += amount;

      return {
        id: t.id,
        reference: t.reference,
        type: t.type,
        amount,
        isIn,
        isOut,
        description: t.description,
        debitAccount: t.debitAccount?.name || 'Vault / Cash In',
        creditAccount: t.creditAccount?.name || 'Out / Client',
        performedBy: t.performedByUser?.staffProfile?.fullName || t.performedByUser?.username || 'Staff',
        timestamp: t.timestamp,
      };
    });

    const closingBalance = openingBalance + totalIn - totalOut;

    return res.json({
      success: true,
      data: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        openingBalance,
        totalIn,
        totalOut,
        closingBalance,
        transactions: formattedTxns,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List Cash Accounts (Drawers, MoMo Wallets, Bank Accounts)
 */
export const listCashAccounts = async (req, res) => {
  try {
    const accounts = await prisma.cashAccount.findMany({
      include: { branch: true },
      orderBy: { id: 'asc' },
    });

    return res.json({ success: true, count: accounts.length, data: accounts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create or Update Cash Account
 */
export const createCashAccount = async (req, res) => {
  try {
    const { name, type, accountNumber, initialBalance = 0, branchId = 1 } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Account name and type are required' });
    }

    const account = await prisma.cashAccount.create({
      data: {
        name,
        type,
        accountNumber,
        currentBalance: parseFloat(initialBalance),
        branchId: parseInt(branchId, 10),
      },
    });

    return res.status(201).json({ success: true, message: 'Cash Account created', data: account });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List operational expenses
 */
export const listExpenses = async (req, res) => {
  try {
    const { status, category, startDate, endDate } = req.query;

    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        submittedByUser: { select: { username: true, staffProfile: { select: { fullName: true } } } },
        approvedByUser: { select: { username: true, staffProfile: { select: { fullName: true } } } },
        paidByUser: { select: { username: true, staffProfile: { select: { fullName: true } } } },
      },
      orderBy: { expenseDate: 'desc' },
    });

    return res.json({ success: true, count: expenses.length, data: expenses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Submit operational expense request
 */
export const submitExpense = async (req, res) => {
  try {
    const { category, description, amount, paymentMethod = 'CASH', notes } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!category || !description || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid category, description and amount' });
    }

    const year = new Date().getFullYear();
    const count = await prisma.expense.count();
    const expenseReference = `EF-EXP-${year}-${String(count + 1).padStart(4, '0')}`;

    const expense = await prisma.expense.create({
      data: {
        expenseReference,
        category,
        description,
        amount: parsedAmount,
        paymentMethod,
        notes,
        submittedByUserId: req.user.id,
        status: 'PENDING_APPROVAL',
      },
    });

    await logAudit({
      action: 'SUBMIT_EXPENSE',
      entityType: 'Expense',
      entityId: expense.id,
      details: { expenseReference, category, amount: parsedAmount },
      req,
    });

    return res.status(201).json({
      success: true,
      message: `Expense request ${expenseReference} submitted for approval`,
      data: expense,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve and pay an expense
 */
export const approveExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, cashAccountId } = req.body; // 'APPROVED' or 'REJECTED'

    const expenseId = parseInt(id, 10);
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });

    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    if (expense.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ success: false, message: `Expense already processed: ${expense.status}` });
    }

    if (decision === 'REJECTED') {
      const updated = await prisma.expense.update({
        where: { id: expense.id },
        data: { status: 'REJECTED', approvedByUserId: req.user.id },
      });
      return res.json({ success: true, message: 'Expense request rejected', data: updated });
    }

    // Approve and mark PAID
    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expense.id },
        data: {
          status: 'PAID',
          approvedByUserId: req.user.id,
          paidByUserId: req.user.id,
        },
      });

      if (cashAccountId) {
        await tx.cashAccount.update({
          where: { id: parseInt(cashAccountId, 10) },
          data: {
            currentBalance: { decrement: expense.amount },
          },
        });
      }

      await tx.financialTransaction.create({
        data: {
          reference: `EF-TXN-${expense.expenseReference}`,
          type: 'EXPENSE',
          amount: expense.amount,
          creditAccountId: cashAccountId ? parseInt(cashAccountId, 10) : null,
          expenseId: expense.id,
          description: `Operational Expense (${expense.category}): ${expense.description}`,
          performedByUserId: req.user.id,
        },
      });
    });

    await logAudit({
      action: 'APPROVE_EXPENSE',
      entityType: 'Expense',
      entityId: expense.id,
      details: { expenseReference: expense.expenseReference, amount: expense.amount },
      req,
    });

    return res.json({ success: true, message: `Expense ${expense.expenseReference} approved and recorded as paid.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

