import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  ShieldCheck,
  UserX,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Activity,
  Award,
  Trash2,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const StaffManagement = () => {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [perfModalOpen, setPerfModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [perfData, setPerfData] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    phone: '',
    role: 'LOAN_OFFICER',
    department: 'Credit & Loans',
    jobTitle: 'Field Credit Officer',
    password: 'Password123!',
  });

  const [newPassword, setNewPassword] = useState('Password123!');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff');
      if (res.success) {
        setStaffList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/staff', formData);
      if (res.success) {
        setSuccessMsg(`Staff account ${res.data.staffId} successfully created!`);
        setTimeout(() => {
          setCreateModalOpen(false);
          fetchStaff();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staffId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this staff account?`)) return;
    try {
      await api.patch(`/staff/${staffId}/status`, { action });
      fetchStaff();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (staff.role === 'SUPER_ADMIN') {
      alert('The Super Administrator account cannot be deleted.');
      return;
    }
    const confirmed = window.confirm(
      `CRITICAL ACTION:\nAre you sure you want to permanently delete staff member "${staff.fullName}" (${staff.staffId || staff.username})?\n\nThis will permanently delete this worker account and revoke all system access.`
    );
    if (!confirmed) return;

    try {
      const res = await api.delete(`/staff/${staff.id}`);
      if (res.success) {
        alert(res.message);
        fetchStaff();
      }
    } catch (err) {
      alert('Delete failed: ' + (err.message || 'Server error'));
    }
  };

  const handleOpenPerformance = async (staff) => {
    setSelectedStaff(staff);
    setPerfModalOpen(true);
    setPerfData(null);
    try {
      const res = await api.get(`/staff/${staff.id}/performance`);
      if (res.success) {
        setPerfData(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/staff/${selectedStaff.id}/reset-password`, { newPassword });
      setResetModalOpen(false);
      alert('Staff password reset successfully');
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
          <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">Staff Account Management</h2>
          <p className="text-xs text-slate-500">
            Create worker credentials, assign strict Role-Based Access Controls (RBAC), and review operational performance.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              fullName: '',
              email: '',
              username: '',
              phone: '',
              role: 'LOAN_OFFICER',
              department: 'Credit & Loans',
              jobTitle: 'Field Credit Officer',
              password: 'Password123!',
            });
            setErrorMsg('');
            setSuccessMsg('');
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          Create Worker Account
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Role Assigned</th>
                <th className="py-3 px-4">Department / Title</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading staff accounts...</td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No staff members found.</td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-navy-950 font-mono">{s.staffId}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{s.fullName}</span>
                      <span className="text-slate-400 text-[10px]">{s.email}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                        {s.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.jobTitle}
                      <span className="block text-[10px] text-slate-400">{s.department}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.phone}</td>
                    <td className="py-3 px-4">
                      {s.isSuspended ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                          SUSPENDED
                        </span>
                      ) : s.isActive ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
                          DEACTIVATED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenPerformance(s)}
                        title="View Performance KPI"
                        className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg"
                      >
                        <Activity className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStaff(s);
                          setResetModalOpen(true);
                        }}
                        title="Reset Password"
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      {s.role !== 'SUPER_ADMIN' && (
                        <>
                          <button
                            onClick={() => handleToggleStatus(s.id, s.isActive ? 'deactivate' : 'activate')}
                            title={s.isActive ? 'Deactivate Account' : 'Activate Account'}
                            className={`p-1.5 rounded-lg ${s.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(s)}
                            title="Permanently Delete Staff Member"
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Staff Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Staff Member Account"
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
              <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Kwabena Mensah"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">System Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. kwabena.m"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Staff Corporate Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="kwabena@elfaith.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0245567890"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
              >
                <option value="CEO">CEO (CHIEF EXECUTIVE OFFICER)</option>
                <option value="BRANCH_MANAGER">BRANCH MANAGER</option>
                <option value="LOAN_OFFICER">LOAN OFFICER</option>
                <option value="CASHIER">CASHIER / TELLER</option>
                <option value="ACCOUNTANT">ACCOUNTANT</option>
                <option value="AUDITOR">AUDITOR</option>
                <option value="CUSTOMER_SERVICE">CUSTOMER SERVICE</option>
                <option value="SUPER_ADMIN">SUPER ADMINISTRATOR</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Initial Password *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              {submitting ? 'Creating...' : 'Create Worker Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Staff Performance Modal */}
      <Modal
        isOpen={perfModalOpen}
        onClose={() => setPerfModalOpen(false)}
        title={selectedStaff ? `Performance Metrics: ${selectedStaff.fullName}` : 'Performance'}
        maxWidth="max-w-md"
      >
        {!perfData ? (
          <div className="py-8 text-center text-slate-400">Loading performance data...</div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Clients Registered</span>
                <span className="text-xl font-black text-navy-950">{perfData.clientsRegistered}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Applications Submitted</span>
                <span className="text-xl font-black text-navy-950">{perfData.applicationsSubmitted}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Loans Disbursed</span>
                <span className="text-xl font-black text-navy-950">{perfData.loansDisbursed}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Repayments Received</span>
                <span className="text-xl font-black text-emerald-700">{perfData.repaymentsCollected}</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
              <span className="font-bold text-emerald-900">Total Money Collected:</span>
              <span className="font-extrabold text-emerald-800 text-sm">
                GH₵ {Number(perfData.totalCollectedAmount).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={selectedStaff ? `Reset Password: ${selectedStaff.fullName}` : 'Reset'}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">New Password *</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm"
            >
              Reset Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

