import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Repayments = () => {
  const { user, hasRole } = useAuth();
  const [repayments, setRepayments] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [selectedRepayment, setSelectedRepayment] = useState(null);

  // Form State
  const [paymentForm, setPaymentForm] = useState({
    loanId: '',
    amount: '',
    paymentMethod: 'CASH',
    transactionReference: '',
    cashAccountId: '',
    notes: '',
  });

  const [reversalReason, setReversalReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedReceipt, setGeneratedReceipt] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRepayments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/repayments');
      if (res.success) {
        setRepayments(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAux = async () => {
    try {
      const [loanRes, accRes] = await Promise.all([
        api.get('/loans?status=ACTIVE'),
        api.get('/accounting/accounts'),
      ]);
      if (loanRes.success) setActiveLoans(loanRes.data);
      if (accRes.success) setCashAccounts(accRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRepayments();
    fetchAux();
  }, []);

  const handleOpenRecord = () => {
    setPaymentForm({
      loanId: activeLoans[0]?.id || '',
      amount: '',
      paymentMethod: 'CASH',
      transactionReference: `CASH-REC-${Date.now().toString().slice(-6)}`,
      cashAccountId: cashAccounts[0]?.id || '',
      notes: 'Counter payment received and verified.',
    });
    setGeneratedReceipt(null);
    setErrorMsg('');
    setRecordModalOpen(true);
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.post('/repayments', paymentForm);
      if (res.success) {
        setGeneratedReceipt(res.data);
        fetchRepayments();
        fetchAux();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReversal = (rep) => {
    setSelectedRepayment(rep);
    setReversalReason('');
    setErrorMsg('');
    setReversalModalOpen(true);
  };

  const handleReversalSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.post('/repayments/request-reversal', {
        repaymentId: selectedRepayment.id,
        reason: reversalReason,
      });

      if (res.success) {
        // If user is Admin or Manager, auto-prompt to approve directly
        if (hasRole('SUPER_ADMIN', 'BRANCH_MANAGER')) {
          await api.post('/repayments/approve-reversal', {
            reversalId: res.data.id,
            decision: 'APPROVED',
          });
        }
        setReversalModalOpen(false);
        fetchRepayments();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Reversal submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const myCollections = repayments.filter(
    (r) => r.receivingCashierId === user?.id || r.cashier?.id === user?.id
  );
  const myTotalAmount = myCollections.reduce(
    (sum, r) => sum + parseFloat(r.amountPaid || 0),
    0
  );
  const myTodayAmount = myCollections
    .filter((r) => (r.paymentDate || r.createdAt)?.slice(0, 10) === todayStr)
    .reduce((sum, r) => sum + parseFloat(r.amountPaid || 0), 0);

  const filteredRepayments = repayments.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.receiptNumber?.toLowerCase().includes(q) ||
      r.client?.fullName?.toLowerCase().includes(q) ||
      r.client?.clientId?.toLowerCase().includes(q) ||
      r.client?.phone?.includes(q) ||
      r.loan?.loanAccountNumber?.toLowerCase().includes(q) ||
      r.cashier?.staffProfile?.fullName?.toLowerCase().includes(q) ||
      r.cashier?.username?.toLowerCase().includes(q) ||
      r.cashier?.staffId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Personal Staff Collections Widget */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 shadow-xl border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-700/60">
          <div>
            <div className="text-emerald-400 font-bold text-xs uppercase tracking-wider">
              Personal Collection Desk • {user?.fullName || user?.username} ({user?.staffId || 'STAFF'})
            </div>
            <h2 className="text-xl font-black text-white mt-0.5">My Total Money Collected</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Personal field and counter collections with customer name, amount, and exact timestamp.
            </p>
          </div>
          <button
            onClick={() => setRecordModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Receive & Key In Payment
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Today's Collections ({new Date().toLocaleDateString('en-GB')})
            </div>
            <div className="text-2xl font-black text-emerald-400">
              GH₵ {myTodayAmount.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              {myCollections.filter((r) => (r.paymentDate || r.createdAt)?.slice(0, 10) === todayStr).length} payment(s) today
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total Money Collected by Me
            </div>
            <div className="text-2xl font-black text-white">
              GH₵ {myTotalAmount.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              {myCollections.length} total receipts keyed in
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl flex flex-col justify-between">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Workstation Branch
            </div>
            <div className="text-base font-bold text-white">Wassa Powuako Branch</div>
            <div className="text-xs text-emerald-400 font-semibold mt-1">Status: Active &bull; Connected</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-navy-950 tracking-tight">Repayments & Receipts Ledger</h2>
          <p className="text-xs text-slate-500">
            Audit trail of customer payments with name, amount, and exact receipt timestamp.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, phone, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {hasRole('SUPER_ADMIN', 'CEO', 'BRANCH_MANAGER', 'CASHIER', 'LOAN_OFFICER', 'ACCOUNTANT', 'CUSTOMER_SERVICE') && (
            <button
              onClick={handleOpenRecord}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all shrink-0"
            >
              <Plus className="w-4 h-4 text-gold-400" />
              Key In Repayment
            </button>
          )}
        </div>
      </div>

      {/* Repayments History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Loan Account</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Principal / Interest</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Keyed In By (Staff)</th>
                <th className="py-3 px-4 text-right">Receipt / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Loading repayment transactions...</td>
                </tr>
              ) : filteredRepayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {searchQuery ? 'No repayment records matched your search.' : 'No repayment entries found.'}
                  </td>
                </tr>
              ) : (
                filteredRepayments.map((r) => (
                  <tr key={r.id} className={`hover:bg-slate-50/60 transition-colors ${r.isReversed ? 'bg-rose-50/30 line-through opacity-70' : ''}`}>
                    <td className="py-3 px-4 font-extrabold text-navy-950 font-mono">{r.receiptNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.client.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {r.client.clientId} • {r.client.phone}
                      </div>
                      {r.client.communityTown && (
                        <div className="text-[10px] text-slate-400">{r.client.communityTown}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-brand-700">{r.loan.loanAccountNumber}</span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-700 text-sm">
                      GH₵ {Number(r.amountPaid).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      GH₵ {Number(r.principalComponent).toFixed(2)} / GH₵ {Number(r.interestComponent).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {r.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      <div>{new Date(r.paymentDate).toLocaleDateString('en-GB')}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(r.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">
                        {r.cashier.staffProfile?.fullName || r.cashier.username}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {r.cashier.staffId || r.cashier.username} ({r.cashier.role?.replace('_', ' ') || 'Staff'})
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {r.receiptPdfUrl && (
                        <a
                          href={r.receiptPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Download Official PDF Receipt"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 rounded-lg font-bold text-slate-700 transition-colors text-[11px]"
                        >
                          <Download className="w-3 h-3" /> PDF
                        </a>
                      )}
                      {!r.isReversed && hasRole('SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT') && (
                        <button
                          onClick={() => handleOpenReversal(r)}
                          title="Authorize Payment Reversal"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Reversal
                        </button>
                      )}
                      {r.isReversed && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                          REVERSED
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Repayment Modal */}
      <Modal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        title="Record Loan Repayment & Issue Receipt"
        maxWidth="max-w-xl"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {generatedReceipt ? (
          <div className="text-center py-6 space-y-4 text-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-navy-950">Payment Confirmed & Recorded!</h3>
            <p className="text-slate-600">
              Receipt No: <span className="font-extrabold text-navy-950">{generatedReceipt.receiptNumber}</span>
              <br />
              Remaining Outstanding Balance: <span className="font-extrabold text-rose-700">GH₵ {Number(generatedReceipt.repayment.outstandingBalanceAfter).toFixed(2)}</span>
            </p>
            {generatedReceipt.receiptPdfUrl && (
              <div className="pt-2">
                <a
                  href={generatedReceipt.receiptPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-md"
                >
                  <Download className="w-4 h-4 text-gold-400" />
                  Download Printable PDF Receipt
                </a>
              </div>
            )}
            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Active Loan Account *</label>
              <select
                required
                value={paymentForm.loanId}
                onChange={(e) => setPaymentForm({ ...paymentForm, loanId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
              >
                <option value="">-- Choose Loan Account --</option>
                {activeLoans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.loanAccountNumber} — {l.client.fullName} (Outstanding: GH₵ {Number(l.totalOutstanding).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount Received (GH₵) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="e.g. 500.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-extrabold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Channel *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-semibold"
                >
                  <option value="CASH">CASH (Counter Teller)</option>
                  <option value="MOBILE_MONEY">MOBILE MONEY (MTN / Telecel)</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER (GCB)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Receiving Cash / MoMo Account</label>
                <select
                  value={paymentForm.cashAccountId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, cashAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                >
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transaction Ref / MoMo ID</label>
                <input
                  type="text"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Cashier Remarks / Notes</label>
              <input
                type="text"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm & Generate PDF Receipt'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reversal Confirmation Modal */}
      <Modal
        isOpen={reversalModalOpen}
        onClose={() => setReversalModalOpen(false)}
        title="Payment Reversal & Correction"
        maxWidth="max-w-md"
      >
        {selectedRepayment && (
          <form onSubmit={handleReversalSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 space-y-1">
              <p className="font-bold">Audit Protected Reversal:</p>
              <p>
                Receipt <span className="font-bold">{selectedRepayment.receiptNumber}</span> of GH₵ {Number(selectedRepayment.amountPaid).toFixed(2)} will be marked as reversed and outstanding balances will be restored without deleting the original record.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Detailed Reason for Reversal *</label>
              <textarea
                rows={3}
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Cashier typo in amount entered, customer duplicate MoMo debit reversed..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReversalModalOpen(false)}
                className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm"
              >
                {submitting ? 'Executing...' : 'Authorize Reversal'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

