import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  DollarSign,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Plus,
  Landmark,
  CreditCard,
  Building,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Cashbook = () => {
  const { user, hasRole } = useAuth();
  const [cashbookData, setCashbookData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');

  // Add Account Modal
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'CASH_DRAWER',
    accountNumber: '',
    initialBalance: 0,
  });

  const fetchCashbook = async () => {
    setLoading(true);
    try {
      let url = '/accounting/cashbook?';
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      if (selectedAccount) url += `accountId=${selectedAccount}&`;

      const res = await api.get(url);
      if (res.success) {
        setCashbookData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounting/accounts');
      if (res.success) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCashbook();
    fetchAccounts();
  }, [startDate, endDate, selectedAccount]);

  const handleExportCsv = async () => {
    try {
      await api.download('/reports/export/loans', 'ELFAITH-Cash-Loans-Report.csv');
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounting/accounts', accountForm);
      setAccountModalOpen(false);
      fetchAccounts();
    } catch (err) {
      alert('Error creating account: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">Cashbook & Financial Operations</h2>
          <p className="text-xs text-slate-500">
            Real-time cash flow, vault balances, MoMo floats, teller cash drawers, and reconciled ledger entries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasRole('SUPER_ADMIN', 'ACCOUNTANT') && (
            <button
              onClick={() => setAccountModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              <Plus className="w-4 h-4 text-brand-600" />
              Add Cash / Bank Account
            </button>
          )}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-navy-950 hover:bg-navy-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5 text-gold-400" />
            Export Ledger CSV
          </button>
        </div>
      </div>

      {/* Cash Accounts Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              {acc.name}
            </span>
            <span className="text-base font-extrabold text-navy-950 block mt-1">
              GH₵ {Number(acc.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
              Type: {acc.type}
            </span>
          </div>
        ))}
      </div>

      {/* Cashbook Summary KPI Strip */}
      {cashbookData && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-gradient-to-r from-navy-950 to-brand-950 p-6 rounded-2xl text-white shadow-md">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Opening Balance</span>
            <span className="text-xl font-black text-slate-200">
              GH₵ {cashbookData.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">+ Total Cash In</span>
            <span className="text-xl font-black text-emerald-400">
              GH₵ {cashbookData.totalIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-400 block">- Total Cash Out</span>
            <span className="text-xl font-black text-rose-400">
              GH₵ {cashbookData.totalOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gold-400 block">= Closing Balance</span>
            <span className="text-xl font-black text-gold-400">
              GH₵ {cashbookData.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">Account Filter</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="">All Cash & Bank Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setStartDate('');
            setEndDate('');
            setSelectedAccount('');
          }}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
        >
          Reset Filters
        </button>
      </div>

      {/* Cashbook Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Cash In (GH₵)</th>
                <th className="py-3 px-4 text-right">Cash Out (GH₵)</th>
                <th className="py-3 px-4">Responsible Officer</th>
                <th className="py-3 px-4">Date / Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading cashbook ledger...</td>
                </tr>
              ) : !cashbookData || cashbookData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No cashbook transactions found for this period.</td>
                </tr>
              ) : (
                cashbookData.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-extrabold text-navy-950 font-mono">{t.reference}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.isIn
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs">{t.description}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                      {t.isIn ? `GH₵ ${t.amount.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-rose-700">
                      {t.isOut ? `GH₵ ${t.amount.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{t.performedBy}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(t.timestamp).toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Modal */}
      <Modal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        title="Create New Financial / Cash Account"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddAccount} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Account Name *</label>
            <input
              type="text"
              required
              value={accountForm.name}
              onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              placeholder="e.g. Cash Drawer 2 (Secondary Teller)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Account Type *</label>
            <select
              value={accountForm.type}
              onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-semibold"
            >
              <option value="CASH_DRAWER">CASH DRAWER</option>
              <option value="MOMO_FLOAT">MOBILE MONEY FLOAT WALLET</option>
              <option value="BANK_ACCOUNT">COMMERCIAL BANK ACCOUNT</option>
              <option value="VAULT">MAIN SAFE / VAULT</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Account Number / SIM Contact</label>
            <input
              type="text"
              value={accountForm.accountNumber}
              onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
              placeholder="e.g. 0240000000 or Bank Acc #"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Initial Balance (GH₵)</label>
            <input
              type="number"
              step="0.01"
              value={accountForm.initialBalance}
              onChange={(e) => setAccountForm({ ...accountForm, initialBalance: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAccountModalOpen(false)}
              className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

