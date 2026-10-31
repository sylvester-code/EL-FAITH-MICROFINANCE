import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, CheckCircle2, AlertCircle, Percent, Clock, ShieldCheck } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const LoanProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    minAmount: 1000,
    maxAmount: 50000,
    interestMethod: 'FLAT_RATE',
    defaultInterestRate: 10,
    minInterestRate: 10,
    maxInterestRate: 10,
    minTermMonths: 1,
    maxTermMonths: 24,
    repaymentFrequency: 'MONTHLY',
    processingFeeRate: 2.5,
    insuranceFeeRate: 1.0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
      if (res.success) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      minAmount: 1000,
      maxAmount: 50000,
      interestMethod: 'FLAT_RATE',
      defaultInterestRate: 10,
      minInterestRate: 8,
      maxInterestRate: 15,
      minTermMonths: 1,
      maxTermMonths: 24,
      repaymentFrequency: 'MONTHLY',
      processingFeeRate: 2.5,
      insuranceFeeRate: 1.0,
    });
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormData({
      code: prod.code,
      name: prod.name,
      description: prod.description,
      minAmount: prod.minAmount,
      maxAmount: prod.maxAmount,
      interestMethod: prod.interestMethod,
      defaultInterestRate: prod.defaultInterestRate,
      minInterestRate: prod.minInterestRate,
      maxInterestRate: prod.maxInterestRate,
      minTermMonths: prod.minTermMonths,
      maxTermMonths: prod.maxTermMonths,
      repaymentFrequency: prod.repaymentFrequency,
      processingFeeRate: prod.processingFeeRate,
      insuranceFeeRate: prod.insuranceFeeRate,
    });
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
        setSuccessMsg(`Product ${formData.code} updated successfully`);
      } else {
        await api.post('/products', formData);
        setSuccessMsg(`Product ${formData.code} created successfully`);
      }
      setTimeout(() => {
        setModalOpen(false);
        fetchProducts();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">Loan Products Configuration</h2>
          <p className="text-xs text-slate-500">
            Define terms, pricing structures, interest calculation methods, and limits for credit offerings.
          </p>
        </div>

        {user?.role === 'SUPER_ADMIN' && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            Add Loan Product
          </button>
        )}
      </div>

      {/* Grid of Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-slate-400">Loading products...</div>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-bold font-mono">
                    {p.code}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {p.interestMethod.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-base font-bold text-navy-950 mb-1">{p.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{p.description}</p>

                <div className="space-y-2 py-3 border-t border-b border-slate-100 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Principal Range:</span>
                    <span className="font-bold text-navy-950">
                      GH₵ {Number(p.minAmount).toLocaleString()} – {Number(p.maxAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Standard Interest Rate:</span>
                    <span className="font-bold text-brand-700">{p.defaultInterestRate}% / Month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Permitted Term:</span>
                    <span className="font-semibold text-slate-700">{p.minTermMonths} to {p.maxTermMonths} Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Repayment Frequency:</span>
                    <span className="font-semibold text-slate-700">{p.repaymentFrequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Processing / Insurance Fee:</span>
                    <span className="font-semibold text-amber-600">{p.processingFeeRate}% / {p.insuranceFeeRate}%</span>
                  </div>
                </div>
              </div>

              {user?.role === 'SUPER_ADMIN' && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-brand-700 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Configuration
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? `Edit ${editingProduct.name}` : 'Create New Loan Product'}
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Product Code *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. BUS-02"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Cocoa Harvest Advance Loan"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Min Principal (GH₵)</label>
              <input
                type="number"
                required
                value={formData.minAmount}
                onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Max Principal (GH₵)</label>
              <input
                type="number"
                required
                value={formData.maxAmount}
                onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Interest Method</label>
              <select
                value={formData.interestMethod}
                onChange={(e) => setFormData({ ...formData, interestMethod: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              >
                <option value="FLAT_RATE">FLAT RATE</option>
                <option value="REDUCING_BALANCE">REDUCING BALANCE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Monthly Rate (%)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.defaultInterestRate}
                onChange={(e) => setFormData({ ...formData, defaultInterestRate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Min Term (Months)</label>
              <input
                type="number"
                required
                value={formData.minTermMonths}
                onChange={(e) => setFormData({ ...formData, minTermMonths: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Max Term (Months)</label>
              <input
                type="number"
                required
                value={formData.maxTermMonths}
                onChange={(e) => setFormData({ ...formData, maxTermMonths: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Repayment Frequency</label>
              <select
                value={formData.repaymentFrequency}
                onChange={(e) => setFormData({ ...formData, repaymentFrequency: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              >
                <option value="MONTHLY">MONTHLY</option>
                <option value="FORTNIGHTLY">FORTNIGHTLY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="DAILY">DAILY</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Processing Fee Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.processingFeeRate}
                onChange={(e) => setFormData({ ...formData, processingFeeRate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Insurance Fee Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.insuranceFeeRate}
                onChange={(e) => setFormData({ ...formData, insuranceFeeRate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Product Configuration'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

