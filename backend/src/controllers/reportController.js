import prisma from '../config/prisma.js';
import { logAudit } from '../services/auditService.js';

/**
 * Super Administrator and Management Dashboard KPI calculations
 */
export const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      totalClients,
      activeLoansCount,
      pendingApprovalCount,
      approvedAwaitingDisbCount,
      disbursedLoansCount,
      totalStaffCount,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.loan.count({ where: { status: 'ACTIVE' } }),
      prisma.loanApplication.count({ where: { status: 'SUBMITTED' } }),
      prisma.loanApplication.count({ where: { status: 'APPROVED' } }),
      prisma.loanDisbursement.count(),
      prisma.user.count({ where: { role: { not: 'CLIENT' } } }),
    ]);

    // Financial totals
    const disbSum = await prisma.loanDisbursement.aggregate({
      _sum: { grossPrincipal: true, netDisbursedAmount: true },
    });

    const repaymentSums = await prisma.repayment.aggregate({
      where: { isReversed: false },
      _sum: {
        amountPaid: true,
        principalComponent: true,
        interestComponent: true,
        feesComponent: true,
      },
    });

    const outstandingSums = await prisma.loan.aggregate({
      where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
      _sum: {
        principalAmount: true,
        totalScheduledRepayment: true,
        outstandingPrincipal: true,
        outstandingInterest: true,
        totalOutstanding: true,
      },
    });

    // Expenses total
    const expenseSum = await prisma.expense.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    });

    // Today's collections
    const todayCollections = await prisma.repayment.aggregate({
      where: {
        paymentDate: { gte: today, lte: endOfToday },
        isReversed: false,
      },
      _sum: { amountPaid: true },
      _count: { id: true },
    });

    // Today's expected installments
    const todayExpected = await prisma.repaymentSchedule.aggregate({
      where: {
        dueDate: { gte: today, lte: endOfToday },
      },
      _sum: { totalDue: true, remainingBalance: true },
      _count: { id: true },
    });

    // Overdue loan accounts
    const overdueSchedules = await prisma.repaymentSchedule.findMany({
      where: {
        dueDate: { lt: today },
        status: { in: ['UPCOMING', 'PARTIALLY_PAID'] },
      },
      select: { loanId: true, remainingBalance: true },
    });

    const uniqueOverdueLoanIds = new Set(overdueSchedules.map((s) => s.loanId));
    const totalOverdueArrears = overdueSchedules.reduce((acc, curr) => acc + Number(curr.remainingBalance), 0);

    // Retrieve Total Loan Capital Allocation setting (Super Admin control)
    const allocationSetting = await prisma.systemSetting.findUnique({
      where: { key: 'TOTAL_LOAN_ALLOCATION' },
    });
    const totalLoanAllocation = allocationSetting?.value ? parseFloat(allocationSetting.value) : 500000.00;
    const totalGrossDisbursed = Number(disbSum._sum.grossPrincipal || 0);
    const remainingLoanAllocation = Math.max(0, totalLoanAllocation - totalGrossDisbursed);
    const allocationUsagePercentage = totalLoanAllocation > 0
      ? Number(((totalGrossDisbursed / totalLoanAllocation) * 100).toFixed(1))
      : 0;

    // Collections & Profit Breakdown
    const totalRepaymentsCollected = Number(repaymentSums._sum.amountPaid || 0);
    const principalRepaid = Number(repaymentSums._sum.principalComponent || 0);
    const interestCollected = Number(repaymentSums._sum.interestComponent || 0);
    const feesCollected = Number(repaymentSums._sum.feesComponent || 0);
    const totalOperationalExpenses = Number(expenseSum._sum.amount || 0);
    const grossProfit = interestCollected + feesCollected;
    const netProfit = grossProfit - totalOperationalExpenses;
    const profitMargin = totalGrossDisbursed > 0
      ? Number(((netProfit / totalGrossDisbursed) * 100).toFixed(2))
      : 0;

    // Recent Collections keyed in by staff with full customer details
    const recentCustomerCollections = await prisma.repayment.findMany({
      where: { isReversed: false },
      take: 12,
      orderBy: { paymentDate: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            clientId: true,
            fullName: true,
            phone: true,
            communityTown: true,
            ghanaCardNumber: true,
          },
        },
        loan: {
          select: {
            id: true,
            loanAccountNumber: true,
            principalAmount: true,
            totalOutstanding: true,
            status: true,
          },
        },
        cashier: {
          select: {
            id: true,
            username: true,
            staffId: true,
            role: true,
            staffProfile: { select: { fullName: true } },
          },
        },
      },
    });

    // Agent Collections Breakdown (Total money received by each agent / staff member)
    const allRepaymentsForAgents = await prisma.repayment.findMany({
      where: { isReversed: false },
      include: {
        cashier: {
          select: {
            id: true,
            username: true,
            staffId: true,
            role: true,
            staffProfile: { select: { fullName: true, phone: true } },
          },
        },
      },
    });

    const agentMap = {};
    allRepaymentsForAgents.forEach((rep) => {
      const aId = rep.cashier?.id || rep.receivingCashierId;
      const aName = rep.cashier?.staffProfile?.fullName || rep.cashier?.username || 'Agent';
      const staffId = rep.cashier?.staffId || `EF-ST-${aId}`;
      const role = rep.cashier?.role || 'AGENT';
      const phone = rep.cashier?.staffProfile?.phone || '';

      if (!agentMap[aId]) {
        agentMap[aId] = {
          agentId: aId,
          agentName: aName,
          staffId,
          role,
          phone,
          totalReceived: 0,
          collectionsCount: 0,
          lastCollectionAt: rep.paymentDate,
        };
      }
      agentMap[aId].totalReceived += Number(rep.amountPaid);
      agentMap[aId].collectionsCount += 1;
      if (new Date(rep.paymentDate) > new Date(agentMap[aId].lastCollectionAt)) {
        agentMap[aId].lastCollectionAt = rep.paymentDate;
      }
    });

    const agentCollections = Object.values(agentMap).sort((a, b) => b.totalReceived - a.totalReceived);

    // Monthly disbursement & collection trends (last 6 months)
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthName = monthStart.toLocaleString('default', { month: 'short' });

      const [disbResult, repResult] = await Promise.all([
        prisma.loanDisbursement.aggregate({
          where: { disbursedAt: { gte: monthStart, lte: monthEnd } },
          _sum: { grossPrincipal: true },
        }),
        prisma.repayment.aggregate({
          where: { paymentDate: { gte: monthStart, lte: monthEnd }, isReversed: false },
          _sum: { amountPaid: true },
        }),
      ]);

      monthlyStats.push({
        month: monthName,
        disbursed: Number(disbResult._sum.grossPrincipal || 0),
        repayments: Number(repResult._sum.amountPaid || 0),
      });
    }

    // Recent 5 financial transactions
    const recentTransactions = await prisma.financialTransaction.findMany({
      orderBy: { timestamp: 'desc' },
      take: 6,
      include: {
        performedByUser: { select: { username: true, staffProfile: { select: { fullName: true } } } },
      },
    });

    // Recent 5 audit logs
    const recentActivities = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    return res.json({
      success: true,
      data: {
        kpis: {
          totalClients,
          activeLoansCount,
          pendingApprovalCount,
          approvedAwaitingDisbCount,
          disbursedLoansCount,
          totalStaffCount,
          totalLoanAllocation,
          totalGrossDisbursed,
          totalNetDisbursed: Number(disbSum._sum.netDisbursedAmount || 0),
          remainingLoanAllocation,
          allocationUsagePercentage,
          totalRepaymentsCollected,
          principalRepaid,
          interestCollected,
          feesCollected,
          grossProfit,
          totalOperationalExpenses,
          netProfit,
          profitMargin,
          outstandingPrincipal: Number(outstandingSums._sum.outstandingPrincipal || 0),
          totalOutstandingBalance: Number(outstandingSums._sum.totalOutstanding || 0),
          overdueAccountsCount: uniqueOverdueLoanIds.size,
          totalOverdueArrears,
          expectedRepaymentsToday: Number(todayExpected._sum.totalDue || 0),
          actualRepaymentsToday: Number(todayCollections._sum.amountPaid || 0),
          todayPaymentCount: todayCollections._count.id || 0,
        },
        monthlyTrends: monthlyStats,
        agentCollections,
        recentCustomerCollections,
        recentTransactions,
        recentActivities,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Super Administrator updates total loan allocation pool
 */
export const updateLoanAllocation = async (req, res) => {
  try {
    const { allocatedAmount } = req.body;
    const parsedAmount = parseFloat(allocatedAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid loan allocation amount greater than GH₵ 0.00',
      });
    }

    await prisma.systemSetting.upsert({
      where: { key: 'TOTAL_LOAN_ALLOCATION' },
      update: { value: parsedAmount.toFixed(2), description: 'Super Admin Total Allocated Lending Capital Pool' },
      create: { key: 'TOTAL_LOAN_ALLOCATION', value: parsedAmount.toFixed(2), description: 'Super Admin Total Allocated Lending Capital Pool' },
    });

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'UPDATE_LOAN_ALLOCATION',
      entityType: 'SystemSetting',
      details: { allocatedAmount: parsedAmount },
      req,
    });

    return res.json({
      success: true,
      message: `Total loan capital allocation successfully set to GH₵ ${parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      data: { totalLoanAllocation: parsedAmount },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Export report to CSV
 */
export const exportReportCsv = async (req, res) => {
  try {
    const { reportType } = req.params; // 'loans', 'repayments', 'clients', 'cashbook'

    let csvContent = '';

    if (reportType === 'loans') {
      const loans = await prisma.loan.findMany({
        include: { client: true, product: true },
        orderBy: { createdAt: 'desc' },
      });

      csvContent = 'Loan Account,Client ID,Client Name,Phone,Product,Principal (GHS),Interest Rate (%),Term (Months),Status,Outstanding Principal (GHS),Total Outstanding (GHS),Disbursed Date\n';
      loans.forEach((l) => {
        csvContent += `"${l.loanAccountNumber}","${l.client.clientId}","${l.client.fullName}","${l.client.phone}","${l.product.name}",${l.principalAmount},${l.approvedInterestRate},${l.termMonths},"${l.status}",${l.outstandingPrincipal},${l.totalOutstanding},"${l.disbursedAt ? l.disbursedAt.toISOString() : ''}"\n`;
      });
    } else if (reportType === 'repayments') {
      const reps = await prisma.repayment.findMany({
        where: { isReversed: false },
        include: { client: true, loan: true, cashier: { include: { staffProfile: true } } },
        orderBy: { paymentDate: 'desc' },
      });

      csvContent = 'Receipt No,Payment Date,Client ID,Client Name,Loan Account,Amount Paid (GHS),Principal Component (GHS),Interest Component (GHS),Method,Cashier\n';
      reps.forEach((r) => {
        csvContent += `"${r.receiptNumber}","${r.paymentDate.toISOString()}","${r.client.clientId}","${r.client.fullName}","${r.loan.loanAccountNumber}",${r.amountPaid},${r.principalComponent},${r.interestComponent},"${r.paymentMethod}","${r.cashier.staffProfile?.fullName || r.cashier.username}"\n`;
      });
    } else if (reportType === 'clients') {
      const clients = await prisma.client.findMany({
        include: { branch: true },
        orderBy: { createdAt: 'desc' },
      });

      csvContent = 'Client ID,Full Name,Phone,Alt Phone,Ghana Card,Residential Address,Community,Occupation,Next of Kin,Next of Kin Contact,Registered Date\n';
      clients.forEach((c) => {
        csvContent += `"${c.clientId}","${c.fullName}","${c.phone}","${c.altPhone || ''}","${c.ghanaCardNumber}","${c.residentialAddress}","${c.communityTown}","${c.occupation}","${c.nextOfKinName}","${c.nextOfKinPhone}","${c.createdAt.toISOString()}"\n`;
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    await logAudit({
      action: 'EXPORT_REPORT_CSV',
      entityType: 'Report',
      details: { reportType },
      req,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ELFAITH-${reportType}-${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

