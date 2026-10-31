import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Expenses = () => {
  const { user, hasRole } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'FUEL',
    description: '',
    amount: '',
    paymentMethod: 'CASH',
    notes: '',
  });

  // Approve Modal
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedCashAccountId, setSelectedCashAccountId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounting/expenses');
      if (res.success) setExpenses(res.data);
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
        setCashAccounts(res.data);
        if (res.data.length > 0) setSelectedCashAccountId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      await api.post('/accounting/expenses', formData);
      setModalOpen(false);
      fetchExpenses();
    } catch (err) {
      setErrorMsg(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveSubmit = async (decision) => {
    setSubmitting(true);
    try {
      await api.post(`/accounting/expenses/${selectedExpense.id}/approve`, {
        decision,
        cashAccountId: selectedCashAccountId,
      });
      setApproveModalOpen(false);
      fetchExpenses();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">Operational Expense Management</h2>
          <p className="text-xs text-slate-500">
            Branch overheads, utilities, stationery, fuel, and internal payment authorizations.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({ category: 'FUEL', description: '', amount: '', paymentMethod: 'CASH', notes: '' });
            setErrorMsg('');
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          Submit Expense Requisition
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Ref Number</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Approval Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading expense requests...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No expense records found.</td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-navy-950 font-mono">{e.expenseReference}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{e.category}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{e.description}</td>
                    <td className="py-3 px-4 font-extrabold text-navy-950">
                      GH₵ {Number(e.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {e.submittedByUser?.staffProfile?.fullName || e.submittedByUser?.username}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(e.expenseDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {e.status === 'PENDING_APPROVAL' && hasRole('SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT') ? (
                        <button
                          onClick={() => {
                            setSelectedExpense(e);
                            setApproveModalOpen(true);
                          }}
                          className="px-3 py-1 bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700 font-bold rounded-lg text-xs transition-colors border border-brand-200"
                        >
                          Review & Authorize
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit Operational Expense Request"
        maxWidth="max-w-md"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Expense Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
            >
              <option value="FUEL">FUEL (Generator / Office Vehicles)</option>
              <option value="RENT">OFFICE RENT & PREMISES</option>
              <option value="UTILITIES">UTILITIES (Electricity ECG / Water GWCL)</option>
              <option value="STATIONERY">STATIONERY & OFFICE SUPPLIES</option>
              <option value="SALARIES">STAFF ALLOWANCES & SALARIES</option>
              <option value="MARKETING">MARKETING & COMMUNITY OUTREACH</option>
              <option value="REPAIRS">EQUIPMENT MAINTENANCE & REPAIRS</option>
              <option value="OTHER">MISCELLANEOUS ADMINISTRATIVE EXPENSE</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Amount Requested (GH₵) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="e.g. 450.00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold text-sm"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Detailed Description *</label>
            <textarea
              rows={3}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Explain the purpose and justification for this operational expense..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm"
            >
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review & Approve Expense Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title={selectedExpense ? `Authorize Expense: ${selectedExpense.expenseReference}` : 'Authorize'}
        maxWidth="max-w-md"
      >
        {selectedExpense && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex justify-between font-bold text-navy-950">
                <span>{selectedExpense.category}</span>
                <span className="text-emerald-700 font-extrabold">GH₵ {Number(selectedExpense.amount).toFixed(2)}</span>
              </div>
              <p className="text-slate-600">{selectedExpense.description}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Disburse Payment From Account *</label>
              <select
                value={selectedCashAccountId}
                onChange={(e) => setSelectedCashAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
              >
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Bal: GH₵ {Number(a.currentBalance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleApproveSubmit('REJECTED')}
                disabled={submitting}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleApproveSubmit('APPROVED')}
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
              >
                Approve & Pay Cash
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

