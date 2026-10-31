import React, { useState, useEffect } from 'react';
import {
  Banknote,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Download,
  ShieldCheck,
  CreditCard,
  Building,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const LoanDisbursements = () => {
  const { user } = useAuth();
  const [approvedApps, setApprovedApps] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [calcPreview, setCalcPreview] = useState(null);

  const [disburseForm, setDisburseForm] = useState({
    paymentMethod: 'CASH',
    destinationAccount: '',
    transactionReference: '',
    cashAccountId: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [voucherUrl, setVoucherUrl] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, accRes] = await Promise.all([
        api.get('/loans/applications?status=APPROVED'),
        api.get('/accounting/accounts'),
      ]);
      if (appRes.success) setApprovedApps(appRes.data);
      if (accRes.success) {
        setCashAccounts(accRes.data);
        if (accRes.data.length > 0) {
          setDisburseForm((prev) => ({ ...prev, cashAccountId: accRes.data[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDisburse = async (app) => {
    setSelectedApp(app);
    setErrorMsg('');
    setVoucherUrl(null);

    // Fetch calculation preview
    try {
      const prev = await api.post('/loans/preview-calc', {
        principal: app.approvedAmount || app.requestedAmount,
        interestRate: app.proposedInterestRate,
        interestMethod: app.product.interestMethod,
        termMonths: app.repaymentPeriodMonths,
        repaymentFrequency: app.repaymentFrequency,
        processingFeeRate: app.product.processingFeeRate,
        insuranceFeeRate: app.product.insuranceFeeRate,
      });
      if (prev.success) {
        setCalcPreview(prev.data);
      }
    } catch (err) {
      console.error(err);
    }

    setDisburseForm({
      paymentMethod: 'CASH',
      destinationAccount: app.client.phone || '',
      transactionReference: `CASH-DISB-${Date.now().toString().slice(-6)}`,
      cashAccountId: cashAccounts[0]?.id || '',
      notes: 'Disbursement authorized and funds handed over at counter.',
    });
    setDisburseModalOpen(true);
  };

  const handleDisburseSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        applicationId: selectedApp.id,
        paymentMethod: disburseForm.paymentMethod,
        destinationAccount: disburseForm.destinationAccount,
        transactionReference: disburseForm.transactionReference,
        cashAccountId: disburseForm.cashAccountId,
        notes: disburseForm.notes,
      };

      const res = await api.post('/loans/disburse', payload);
      if (res.success) {
        setVoucherUrl(res.data.voucherUrl);
        fetchData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Disbursement execution failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">Loan Disbursements Management</h2>
          <p className="text-xs text-slate-500">
            Controlled authorization, statutory deduction calculations, and issuance of disbursement vouchers.
          </p>
        </div>
      </div>

      {/* Approved Awaiting Disbursement Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Approved Applications Ready for Disbursement ({approvedApps.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Strict Separation of Duties Enforced</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Application No</th>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-4">Approved Principal</th>
                <th className="py-3 px-4">Term</th>
                <th className="py-3 px-4">Approved Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading approved applications...</td>
                </tr>
              ) : approvedApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No approved loans awaiting disbursement at this time.
                  </td>
                </tr>
              ) : (
                approvedApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-extrabold text-brand-700">{app.applicationNumber}</td>
                    <td className="py-3 px-4 font-bold text-navy-950">
                      {app.client.fullName}
                      <span className="block text-[10px] text-slate-400 font-normal">{app.client.clientId}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{app.product.name}</td>
                    <td className="py-3 px-4 font-extrabold text-navy-950">
                      GH₵ {Number(app.approvedAmount || app.requestedAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{app.repaymentPeriodMonths} Months ({app.repaymentFrequency})</td>
                    <td className="py-3 px-4 text-slate-500">
                      {app.approvedAt ? new Date(app.approvedAt).toLocaleDateString('en-GB') : 'Approved'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenDisburse(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-sm text-xs"
                      >
                        <Banknote className="w-3.5 h-3.5 text-gold-400" />
                        Disburse Funds
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disbursement Modal */}
      <Modal
        isOpen={disburseModalOpen}
        onClose={() => setDisburseModalOpen(false)}
        title={selectedApp ? `Disburse Loan: ${selectedApp.applicationNumber}` : 'Disburse'}
        maxWidth="max-w-2xl"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {voucherUrl ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-lg font-bold text-navy-950">Loan Successfully Disbursed & Originated!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              The loan account and full repayment schedule have been generated in the ledger. Download the official disbursement voucher below.
            </p>
            <div className="pt-2">
              <a
                href={voucherUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                <Download className="w-4 h-4 text-gold-400" />
                Download Official Disbursement Voucher (PDF)
              </a>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDisburseModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          calcPreview && (
            <form onSubmit={handleDisburseSubmit} className="space-y-4 text-xs">
              {/* Financial Deductions Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Disbursement Payout Verification
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Determined by Super Admin
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-medium">Principal to Send:</span>
                  <span className="font-extrabold text-navy-950 font-mono">GH₵ {calcPreview.principal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Less: Processing Fee (2.5%):</span>
                  <span className="font-semibold text-amber-700">- GH₵ {calcPreview.processingFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Less: Credit Insurance Fee (1.0%):</span>
                  <span className="font-semibold text-amber-700">- GH₵ {calcPreview.insuranceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold border-t border-slate-200 pt-2 text-emerald-700 font-mono">
                  <span>Net Cash Payout to Client:</span>
                  <span>GH₵ {calcPreview.netDisbursement.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Disbursement Channel *</label>
                  <select
                    value={disburseForm.paymentMethod}
                    onChange={(e) => setDisburseForm({ ...disburseForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                  >
                    <option value="CASH">CASH AT COUNTER</option>
                    <option value="MOBILE_MONEY">MOBILE MONEY (MTN / TELECEL)</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER (GCB)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Source Cash Account *</label>
                  <select
                    value={disburseForm.cashAccountId}
                    onChange={(e) => setDisburseForm({ ...disburseForm, cashAccountId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                  >
                    {cashAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Bal: GH₵ {Number(acc.currentBalance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination Phone / Account Number</label>
                  <input
                    type="text"
                    required
                    value={disburseForm.destinationAccount}
                    onChange={(e) => setDisburseForm({ ...disburseForm, destinationAccount: e.target.value })}
                    placeholder="e.g. 0245567890 or Cashier Handover"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Reference / MoMo ID</label>
                  <input
                    type="text"
                    required
                    value={disburseForm.transactionReference}
                    onChange={(e) => setDisburseForm({ ...disburseForm, transactionReference: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Disbursement Remarks / Voucher Notes</label>
                <textarea
                  rows={2}
                  value={disburseForm.notes}
                  onChange={(e) => setDisburseForm({ ...disburseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDisburseModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-gold-400" />
                  {submitting ? 'Executing...' : 'Confirm & Disburse GH₵ ' + calcPreview.netDisbursement.toFixed(2)}
                </button>
              </div>
            </form>
          )
        )}
      </Modal>
    </div>
  );
};

