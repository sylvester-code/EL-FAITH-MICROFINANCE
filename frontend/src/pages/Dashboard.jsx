import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Banknote,
  Receipt,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  PlusCircle,
  FileText,
  DollarSign,
  Activity,
  Wallet,
  Percent,
  CheckCircle2,
  Sliders,
  Edit3,
  Download,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { Badge, StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Allocation Modal State
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [allocationInput, setAllocationInput] = useState('');
  const [updatingAllocation, setUpdatingAllocation] = useState(false);
  const [allocationMsg, setAllocationMsg] = useState({ type: '', text: '' });

  const fetchSummary = async () => {
    try {
      const res = await api.get('/reports/dashboard-summary');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleOpenAllocationModal = () => {
    setAllocationInput(data?.kpis?.totalLoanAllocation || 500000);
    setAllocationMsg({ type: '', text: '' });
    setAllocationModalOpen(true);
  };

  const handleSaveAllocation = async (e) => {
    e.preventDefault();
    setUpdatingAllocation(true);
    setAllocationMsg({ type: '', text: '' });
    try {
      const res = await api.post('/reports/loan-allocation', {
        allocatedAmount: allocationInput,
      });
      if (res.success) {
        setAllocationMsg({ type: 'success', text: res.message });
        await fetchSummary();
        setTimeout(() => {
          setAllocationModalOpen(false);
        }, 1200);
      }
    } catch (err) {
      setAllocationMsg({ type: 'error', text: err.message || 'Failed to update loan allocation' });
    } finally {
      setUpdatingAllocation(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading live financial operations data...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const monthlyTrends = data?.monthlyTrends || [];
  const agentCollections = data?.agentCollections || [];
  const recentCustomerCollections = data?.recentCustomerCollections || [];
  const recentTxns = data?.recentTransactions || [];
  const recentLogs = data?.recentActivities || [];

  const portfolioPieData = [
    { name: 'Principal Repaid', value: kpis.principalRepaid || 0, color: '#10b981' },
    { name: 'Outstanding Principal', value: kpis.outstandingPrincipal || 0, color: '#0c87eb' },
    { name: 'Overdue Arrears', value: kpis.totalOverdueArrears || 0, color: '#f43f5e' },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-brand-950 to-navy-900 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold-500/20 text-gold-300 border border-gold-500/30">
              {user?.role?.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-400">Wassa Powuako Branch Operations</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.fullName || user?.username}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Live operations dashboard for EL-FAITH MICROFINANCE. All figures reflect verified backend ledger entries.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {user?.role !== 'CLIENT' && (
            <Link
              to="/portal/clients"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white text-navy-950 hover:bg-slate-100 rounded-xl shadow-sm transition-all"
            >
              <Users className="w-3.5 h-3.5 text-brand-600" />
              Register Client
            </Link>
          )}
          {['SUPER_ADMIN', 'CEO', 'BRANCH_MANAGER', 'LOAN_OFFICER'].includes(user?.role) && (
            <Link
              to="/portal/applications"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-brand-600 text-white hover:bg-brand-500 rounded-xl shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 text-gold-400" />
              New Loan App
            </Link>
          )}
          {['SUPER_ADMIN', 'CEO', 'BRANCH_MANAGER', 'CASHIER', 'LOAN_OFFICER', 'ACCOUNTANT', 'CUSTOMER_SERVICE'].includes(user?.role) && (
            <Link
              to="/portal/repayments"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl shadow-sm transition-all"
            >
              <Receipt className="w-3.5 h-3.5 text-gold-400" />
              Record Repayment
            </Link>
          )}
        </div>
      </div>

      {/* Super Admin & Executive Loan Capital Allocation & Profit Engine */}
      {hasRole('SUPER_ADMIN', 'CEO', 'BRANCH_MANAGER') && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
                  <Wallet className="w-5 h-5" />
                </span>
                <h3 className="text-base font-extrabold text-navy-950">
                  Total Loan Capital Allocation & Profit Oversight
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Super Admin lending ceiling, live field collections, and net microfinance profitability.
              </p>
            </div>

            {hasRole('SUPER_ADMIN', 'CEO') && (
              <button
                onClick={handleOpenAllocationModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Sliders className="w-4 h-4 text-gold-400" />
                Allocate Loan Fund
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Allocation Pool */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Loan Allocation Pool
              </span>
              <div className="text-xl sm:text-2xl font-black text-navy-950 mt-1">
                GH₵ {Number(kpis.totalLoanAllocation || 500000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Lending budget ceiling set by Super Admin
              </div>
            </div>

            {/* Disbursed vs Remaining */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Given Out / Disbursed
                </span>
                <span className="text-xs font-bold text-blue-700">
                  {kpis.allocationUsagePercentage || 0}% used
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-950 mt-1">
                GH₵ {Number(kpis.totalGrossDisbursed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              {/* Progress bar */}
              <div className="w-full bg-blue-200/60 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, kpis.allocationUsagePercentage || 0)}%` }}
                />
              </div>
              <div className="text-[11px] text-blue-800 font-semibold mt-1">
                Remaining: GH₵ {Number(kpis.remainingLoanAllocation || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Total Collections */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                Total Collections Received
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                GH₵ {Number(kpis.totalRepaymentsCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-800 font-medium mt-1">
                Principal: GH₵ {Number(kpis.principalRepaid || 0).toLocaleString()} | Today: GH₵ {Number(kpis.actualRepaymentsToday || 0).toLocaleString()}
              </div>
            </div>

            {/* Net Profit */}
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                  Net Profit Earned
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                  {kpis.profitMargin || 0}% margin
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-950 mt-1">
                GH₵ {Number(kpis.netProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-purple-800 font-medium mt-1">
                Gross (Interest + Fees): GH₵ {Number(kpis.grossProfit || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Registered Clients"
          value={kpis.totalClients || 0}
          subtext="Vetted active borrowers"
          icon={Users}
          color="brand"
        />
        <StatCard
          title="Active Loan Facilities"
          value={kpis.activeLoansCount || 0}
          subtext={`Pending Approval: ${kpis.pendingApprovalCount || 0}`}
          icon={FileText}
          color="amber"
        />
        <StatCard
          title="Total Gross Disbursed"
          value={`GH₵ ${(kpis.totalGrossDisbursed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtext={`Net Cash: GH₵ ${(kpis.totalNetDisbursed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={Banknote}
          color="purple"
        />
        <StatCard
          title="Repayments Collected"
          value={`GH₵ ${(kpis.totalRepaymentsCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtext={`Interest Earned: GH₵ ${(kpis.interestCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={Receipt}
          color="emerald"
        />
      </div>

      {/* Secondary Financial Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Outstanding Principal"
          value={`GH₵ ${(kpis.outstandingPrincipal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtext={`Total Contractual: GH₵ ${(kpis.totalOutstandingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={Activity}
          color="brand"
        />
        <StatCard
          title="Overdue Accounts"
          value={`${kpis.overdueAccountsCount || 0} Accounts`}
          subtext={`Arrears Amount: GH₵ ${(kpis.totalOverdueArrears || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          title="Today's Collections"
          value={`GH₵ ${(kpis.actualRepaymentsToday || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtext={`Expected: GH₵ ${(kpis.expectedRepaymentsToday || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={Clock}
          color="emerald"
        />
        <StatCard
          title="Operational Expenses"
          value={`GH₵ ${(kpis.totalOperationalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtext="Branch overhead & logistics"
          icon={DollarSign}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Disbursements vs Repayments Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Disbursements vs Repayments Trend</h3>
              <p className="text-xs text-slate-500">6-Month historical cash performance (GH₵)</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600">
              Monthly Aggregates
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `GH₵${val}`} />
                <Tooltip
                  formatter={(val) => [`GH₵ ${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#07264a', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="disbursed" name="Disbursements" fill="#0c87eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="repayments" name="Collections" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio Distribution Pie Chart */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Loan Portfolio Performance</h3>
            <p className="text-xs text-slate-500">Principal Repaid vs Outstanding vs Arrears</p>
          </div>

          <div className="h-56 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portfolioPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {portfolioPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [`GH₵ ${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#07264a', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
            {portfolioPieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">
                  GH₵ {Number(item.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Loan Collections Keyed In By Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Receipt className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-extrabold text-navy-950">
                Live Customer Loan Collections Keyed In By Staff
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time feed of repayments collected from borrowers by field loan officers and branch cashiers.
            </p>
          </div>
          <Link
            to="/portal/repayments"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
          >
            All Collections & Receipts →
          </Link>
        </div>

        {/* Agent Collections Breakdown - Money Received by Agents */}
        {agentCollections.length > 0 && (
          <div className="space-y-2 border-b border-slate-100 pb-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Money Received by Field Agents & Cashiers:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agentCollections.map((agent) => (
                <div key={agent.agentId} className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-navy-950 text-xs">{agent.agentName}</div>
                    <div className="text-[10px] text-emerald-800 font-semibold">
                      {agent.staffId} • {agent.role?.replace('_', ' ')}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {agent.collectionsCount} collection{agent.collectionsCount > 1 ? 's' : ''} logged
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Money Received:</span>
                    <span className="text-sm font-black text-emerald-800">
                      GH₵ {Number(agent.totalReceived).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Receipt No</th>
                <th className="py-2.5 px-3">Customer Details</th>
                <th className="py-2.5 px-3">Loan Account</th>
                <th className="py-2.5 px-3">Amount Collected</th>
                <th className="py-2.5 px-3">Split (Principal / Interest)</th>
                <th className="py-2.5 px-3">Keyed In By (Staff)</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCustomerCollections.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    No customer collections recorded yet.
                  </td>
                </tr>
              ) : (
                recentCustomerCollections.map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-navy-950">
                      {col.receiptNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{col.client?.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {col.client?.clientId} • {col.client?.phone}
                      </div>
                      {col.client?.communityTown && (
                        <div className="text-[10px] text-slate-400">{col.client?.communityTown}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-brand-700">
                      {col.loan?.loanAccountNumber}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-emerald-700 text-sm">
                      GH₵ {Number(col.amountPaid).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      GH₵ {Number(col.principalComponent).toFixed(2)} / GH₵ {Number(col.interestComponent).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800">
                        {col.cashier?.staffProfile?.fullName || col.cashier?.username}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {col.cashier?.staffId || col.cashier?.username} ({col.cashier?.role?.replace('_', ' ') || 'Staff'})
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      <div>{new Date(col.paymentDate).toLocaleDateString('en-GB')}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(col.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {col.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {col.receiptPdfUrl && (
                        <a
                          href={col.receiptPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 rounded text-slate-700 font-bold text-[11px]"
                        >
                          <Download className="w-3 h-3" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tables Row: Recent Transactions & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Financial Transactions</h3>
              <p className="text-xs text-slate-500">Live disbursements, collections and operational posts</p>
            </div>
            <Link to="/portal/cashbook" className="text-xs font-bold text-brand-600 hover:text-brand-700">
              View Cashbook →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Officer</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTxns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">No recent transactions recorded</td>
                  </tr>
                ) : (
                  recentTxns.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{t.reference}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.type === 'REPAYMENT'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.type === 'DISBURSEMENT'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        GH₵ {Number(t.amount).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {t.performedByUser?.staffProfile?.fullName || t.performedByUser?.username || 'System'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Audit & Security Log</h3>
              <p className="text-xs text-slate-500">Immutable trail of critical system actions</p>
            </div>
            {['SUPER_ADMIN', 'AUDITOR'].includes(user?.role) && (
              <Link to="/portal/audit-logs" className="text-xs font-bold text-brand-600 hover:text-brand-700">
                Full Trail →
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs">No audit logs available</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">{log.action.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-500">By: {log.userEmail || 'System Process'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Super Admin Loan Allocation Modal */}
      <Modal
        isOpen={allocationModalOpen}
        onClose={() => setAllocationModalOpen(false)}
        title="Allocate Total Lending Capital Fund"
        maxWidth="max-w-md"
      >
        {allocationMsg.text && (
          <div className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            allocationMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}>
            {allocationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{allocationMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveAllocation} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Total Lending Capital Allocation (GH₵) *
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Sets the maximum total loan disbursement budget. Once disbursements reach this ceiling, further loan payouts are blocked until you allocate more.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">GH₵</span>
              <input
                type="number"
                step="500"
                required
                value={allocationInput}
                onChange={(e) => setAllocationInput(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full pl-12 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-black text-base text-navy-950"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 space-y-1.5 border border-slate-200/80">
            <div className="flex justify-between">
              <span>Current Gross Disbursed:</span>
              <strong className="text-slate-900 font-mono">
                GH₵ {Number(kpis.totalGrossDisbursed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Total Collections Received:</span>
              <strong className="text-emerald-700 font-mono">
                GH₵ {Number(kpis.totalRepaymentsCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Current Net Profit:</span>
              <strong className="text-purple-700 font-mono">
                GH₵ {Number(kpis.netProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAllocationModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingAllocation}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-all"
            >
              {updatingAllocation ? 'Saving Allocation...' : 'Save Lending Budget'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

