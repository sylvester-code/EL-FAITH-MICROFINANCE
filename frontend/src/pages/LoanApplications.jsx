import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const LoanApplications = () => {
  const { user, hasRole } = useAuth();
  const [applications, setApplications] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  // New Application Form
  const [appForm, setAppForm] = useState({
    clientId: '',
    productId: '',
    requestedAmount: '',
    repaymentPeriodMonths: 6,
    repaymentFrequency: 'DAILY',
    monthlyIncome: '',
    affordabilityDetails: '',
    purpose: '',
  });

  // Review Form
  const [reviewForm, setReviewForm] = useState({
    decision: 'APPROVED',
    comments: '',
    approvedAmount: '',
    interestRate: '',
    termMonths: '',
    conditions: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let url = `/loans/applications?search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await api.get(url);
      if (res.success) {
        setApplications(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/clients?limit=100'),
        api.get('/products?activeOnly=true'),
      ]);
      if (cRes.success) setClients(cRes.data);
      if (pRes.success) setProducts(pRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchApplications();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleOpenCreate = () => {
    setAppForm({
      clientId: clients[0]?.id || '',
      productId: products[0]?.id || '',
      requestedAmount: 5000,
      repaymentPeriodMonths: 6,
      repaymentFrequency: 'DAILY',
      monthlyIncome: 3000,
      affordabilityDetails: 'Verified business cash flow and shop stock inspection',
      purpose: 'Wholesale shop inventory purchase',
    });
    setErrorMsg('');
    setSuccessMsg('');
    setCreateModalOpen(true);
  };

  const handleOpenReview = (app) => {
    setSelectedApp(app);
    setReviewForm({
      decision: 'APPROVED',
      comments: 'Credit assessment verified. Borrower has established business and strong guarantor in Wassa Powuako.',
      approvedAmount: app.requestedAmount,
      interestRate: app.proposedInterestRate,
      termMonths: app.repaymentPeriodMonths,
      conditions: 'Prompt monthly repayment via Cashier or MoMo. Guarantor notified.',
    });
    setErrorMsg('');
    setSuccessMsg('');
    setReviewModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/loans/applications', appForm);
      if (res.success) {
        setSuccessMsg(`Application ${res.data.applicationNumber} submitted successfully!`);
        setTimeout(() => {
          setCreateModalOpen(false);
          fetchApplications();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post(`/loans/applications/${selectedApp.id}/review`, reviewForm);
      if (res.success) {
        setSuccessMsg(`Application decision recorded: ${reviewForm.decision}`);
        setTimeout(() => {
          setReviewModalOpen(false);
          fetchApplications();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Review recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">Loan Applications & Approvals</h2>
          <p className="text-xs text-slate-500">
            Multi-tier appraisal workflow, credit assessment, and authorization control.
          </p>
        </div>

        {hasRole('SUPER_ADMIN', 'BRANCH_MANAGER', 'LOAN_OFFICER') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            Submit Loan Application
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by App No, Client Name, Client ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="DISBURSED">DISBURSED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">App Number</th>
                <th className="py-3 px-4">Borrower</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Requested</th>
                <th className="py-3 px-4">Approved</th>
                <th className="py-3 px-4">Term</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading applications...</td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No applications on record.</td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-extrabold text-brand-700">{app.applicationNumber}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-navy-950 block">{app.client.fullName}</span>
                      <span className="text-slate-400 text-[10px]">{app.client.clientId}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{app.product.name}</td>
                    <td className="py-3 px-4 font-bold text-navy-950">
                      GH₵ {Number(app.requestedAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {app.approvedAmount
                        ? `GH₵ ${Number(app.approvedAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{app.repaymentPeriodMonths} Mo ({app.repaymentFrequency})</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {hasRole('SUPER_ADMIN', 'CEO') && app.status === 'SUBMITTED' && (
                        <button
                          onClick={() => handleOpenReview(app)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700 font-bold rounded-lg transition-colors border border-brand-200"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Determine & Approve Loan
                        </button>
                      )}
                      {app.status === 'APPROVED' && (
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Ready for Disbursement
                        </span>
                      )}
                      {app.status === 'DISBURSED' && (
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Active Facility
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

      {/* New Application Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Originate Loan Application"
        maxWidth="max-w-2xl"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Client *</label>
              <select
                required
                value={appForm.clientId}
                onChange={(e) => setAppForm({ ...appForm, clientId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              >
                <option value="">-- Choose Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.clientId}) - {c.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Loan Facility *</label>
              <select
                required
                value={appForm.productId}
                onChange={(e) => setAppForm({ ...appForm, productId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              >
                <option value="">-- Choose Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.defaultInterestRate}% / mo)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Requested Amount (GH₵) *</label>
              <input
                type="number"
                step="100"
                required
                value={appForm.requestedAmount}
                onChange={(e) => setAppForm({ ...appForm, requestedAmount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Period (Months) *</label>
              <input
                type="number"
                required
                value={appForm.repaymentPeriodMonths}
                onChange={(e) => setAppForm({ ...appForm, repaymentPeriodMonths: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Repayment Frequency</label>
              <select
                value={appForm.repaymentFrequency}
                onChange={(e) => setAppForm({ ...appForm, repaymentFrequency: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-semibold"
              >
                <option value="MONTHLY">MONTHLY</option>
                <option value="FORTNIGHTLY">FORTNIGHTLY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="DAILY">DAILY</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Client Monthly Income (GH₵)</label>
              <input
                type="number"
                value={appForm.monthlyIncome}
                onChange={(e) => setAppForm({ ...appForm, monthlyIncome: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Affordability & Field Vetting Notes</label>
              <input
                type="text"
                value={appForm.affordabilityDetails}
                onChange={(e) => setAppForm({ ...appForm, affordabilityDetails: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Loan Purpose & Business Objective *</label>
            <textarea
              rows={3}
              required
              value={appForm.purpose}
              onChange={(e) => setAppForm({ ...appForm, purpose: e.target.value })}
              placeholder="e.g. Purchase of 50 bags of NPK fertilizer and farm supplies for upcoming cocoa harvesting..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for Committee Review'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={selectedApp ? `Review Application: ${selectedApp.applicationNumber}` : 'Appraisal'}
        maxWidth="max-w-2xl"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {selectedApp && (
          <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between font-bold text-navy-950">
                <span>Borrower: {selectedApp.client.fullName} ({selectedApp.client.clientId})</span>
                <span>Requested: GH₵ {Number(selectedApp.requestedAmount).toFixed(2)}</span>
              </div>
              <p className="text-slate-500">Purpose: {selectedApp.purpose}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Committee Decision *</label>
              <select
                value={reviewForm.decision}
                onChange={(e) => setReviewForm({ ...reviewForm, decision: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
              >
                <option value="APPROVED">APPROVE APPLICATION</option>
                <option value="REJECTED">REJECT APPLICATION</option>
                <option value="MORE_INFO_REQUIRED">REQUEST ADDITIONAL INFORMATION</option>
              </select>
            </div>

            {reviewForm.decision === 'APPROVED' && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Super Admin Authority:</strong> You are determining the exact principal amount that will be disbursed/sent to the customer.
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Loan Amount to Send (GH₵) *
                    </label>
                    <input
                      type="number"
                      step="100"
                      required
                      value={reviewForm.approvedAmount}
                      onChange={(e) => setReviewForm({ ...reviewForm, approvedAmount: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-black text-navy-950"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Interest Rate (%/mo)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={reviewForm.interestRate}
                      onChange={(e) => setReviewForm({ ...reviewForm, interestRate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Term (Months)</label>
                    <input
                      type="number"
                      required
                      value={reviewForm.termMonths}
                      onChange={(e) => setReviewForm({ ...reviewForm, termMonths: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {reviewForm.decision === 'REJECTED' ? 'Reason for Rejection *' : 'Approval Conditions / Committee Comments'}
              </label>
              <textarea
                rows={3}
                required
                value={reviewForm.comments}
                onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-6 py-2.5 font-bold text-white rounded-xl shadow-md disabled:opacity-50 ${
                  reviewForm.decision === 'REJECTED'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {submitting ? 'Recording...' : `Confirm ${reviewForm.decision}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

