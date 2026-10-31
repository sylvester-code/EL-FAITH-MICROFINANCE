import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PhoneCall,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  FileText,
  UserCheck,
  Plus,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const OverdueTracker = () => {
  const { user } = useAuth();
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Follow-up Modal
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({
    interactionType: 'PHONE_CALL',
    notes: '',
    promisedPaymentDate: '',
    promisedAmount: '',
    outcome: 'Client promised to visit branch',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchOverdue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recovery/overdue');
      if (res.success) {
        setOverdueLoans(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();
  }, []);

  const handleOpenFollowUp = (loan) => {
    setSelectedLoan(loan);
    setFollowUpForm({
      interactionType: 'PHONE_CALL',
      notes: '',
      promisedPaymentDate: '',
      promisedAmount: loan.totalOverdueArrears || '',
      outcome: 'Client promised payment',
    });
    setSuccessMsg('');
    setFollowUpModalOpen(true);
  };

  const handleFollowUpSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/recovery/follow-up', {
        clientId: selectedLoan.clientId,
        loanId: selectedLoan.loanId,
        interactionType: followUpForm.interactionType,
        notes: followUpForm.notes,
        promisedPaymentDate: followUpForm.promisedPaymentDate || null,
        promisedAmount: followUpForm.promisedAmount ? parseFloat(followUpForm.promisedAmount) : null,
        outcome: followUpForm.outcome,
      });
      setSuccessMsg('Recovery follow-up logged successfully.');
      setTimeout(() => {
        setFollowUpModalOpen(false);
        fetchOverdue();
      }, 1000);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">Loan Monitoring & Recovery</h2>
        <p className="text-xs text-slate-500">
          Track delinquent accounts, portfolio aging, days in arrears, and record ethical collection interactions.
        </p>
      </div>

      {/* Overdue Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
              Delinquent Accounts Requiring Recovery Follow-Up ({overdueLoans.length})
            </h3>
          </div>
          <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
            Lawful Debt Recovery Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Loan Account</th>
                <th className="py-3 px-4">Borrower Details</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Overdue Arrears</th>
                <th className="py-3 px-4">Days Overdue</th>
                <th className="py-3 px-4">Earliest Due</th>
                <th className="py-3 px-4 text-right">Recovery Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading recovery accounts...</td>
                </tr>
              ) : overdueLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Excellent! All active loan installments are currently performing with zero overdue accounts.
                  </td>
                </tr>
              ) : (
                overdueLoans.map((item) => (
                  <tr key={item.loanId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-extrabold text-navy-950 font-mono">
                      {item.loanAccountNumber}
                      <span className="block text-[10px] text-slate-400 font-normal">{item.productName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{item.clientName}</span>
                      <span className="text-slate-500 text-[11px]">{item.clientPhone}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[160px]">
                      {item.residentialAddress}, {item.communityTown}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-rose-700">
                      GH₵ {Number(item.totalOverdueArrears).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                        {item.maxDaysOverdue} Days Late
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(item.earliestDueDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenFollowUp(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg transition-colors text-xs shadow-sm"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        Log Interaction
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Follow-up Logging Modal */}
      <Modal
        isOpen={followUpModalOpen}
        onClose={() => setFollowUpModalOpen(false)}
        title={selectedLoan ? `Log Recovery Interaction: ${selectedLoan.clientName}` : 'Recovery'}
        maxWidth="max-w-lg"
      >
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {selectedLoan && (
          <form onSubmit={handleFollowUpSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex justify-between font-bold text-navy-950">
                <span>Account: {selectedLoan.loanAccountNumber}</span>
                <span className="text-rose-700">Arrears: GH₵ {Number(selectedLoan.totalOverdueArrears).toFixed(2)}</span>
              </div>
              <p className="text-slate-500">Contact: {selectedLoan.clientPhone} | Address: {selectedLoan.residentialAddress}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Interaction Channel *</label>
              <select
                value={followUpForm.interactionType}
                onChange={(e) => setFollowUpForm({ ...followUpForm, interactionType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
              >
                <option value="PHONE_CALL">PHONE CALL</option>
                <option value="FIELD_VISIT">FIELD VISIT (Shop / Residence)</option>
                <option value="OFFICE_VISIT">OFFICE COUNTER INTERVIEW</option>
                <option value="SMS_REMINDER">SMS REMINDER NOTICE</option>
                <option value="FORMAL_LETTER">FORMAL DEMAND NOTICE LETTER</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Promised Payment Date</label>
                <input
                  type="date"
                  value={followUpForm.promisedPaymentDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, promisedPaymentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Promised Amount (GH₵)</label>
                <input
                  type="number"
                  step="0.01"
                  value={followUpForm.promisedAmount}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, promisedAmount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Interaction Notes & Agreed Plan *</label>
              <textarea
                rows={3}
                required
                value={followUpForm.notes}
                onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                placeholder="e.g. Spoke with client regarding the 14 days overdue installment. Client explained delayed market sales and committed to pay GH₵ 500 by Friday..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFollowUpModalOpen(false)}
                className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm"
              >
                {submitting ? 'Saving...' : 'Save Follow-Up Record'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

