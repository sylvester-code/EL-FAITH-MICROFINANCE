import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  UserCheck,
  Eye,
  Phone,
  MapPin,
  CreditCard,
  Building,
  ShieldCheck,
  FileText,
  Clock,
  Receipt,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { Badge, StatusBadge } from '../components/Badge';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Clients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  // Modals
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Registration Form State
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'Male',
    phone: '',
    altPhone: '',
    email: '',
    residentialAddress: '',
    communityTown: 'Wassa Powuako',
    ghanaCardNumber: '',
    occupation: '',
    employerBusinessName: '',
    employmentAddress: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinRelation: 'Spouse',
    notes: '',
    guarantorName: '',
    guarantorPhone: '',
    guarantorAddress: '',
    guarantorOccupation: '',
    guarantorGhanaCard: '',
    guarantorRelationship: 'Guarantor',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/clients?search=${encodeURIComponent(search)}`);
      if (res.success) {
        setClients(res.data);
        setTotal(res.total);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenProfile = async (clientId) => {
    setProfileModalOpen(true);
    setProfileLoading(true);
    try {
      const res = await api.get(`/clients/${clientId}`);
      if (res.success) {
        setSelectedClient(res.data);
      }
    } catch (err) {
      alert('Error fetching client details: ' + err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        phone: formData.phone,
        altPhone: formData.altPhone || null,
        email: formData.email || null,
        residentialAddress: formData.residentialAddress,
        communityTown: formData.communityTown,
        ghanaCardNumber: formData.ghanaCardNumber,
        occupation: formData.occupation,
        employerBusinessName: formData.employerBusinessName || null,
        employmentAddress: formData.employmentAddress || null,
        nextOfKinName: formData.nextOfKinName,
        nextOfKinPhone: formData.nextOfKinPhone,
        nextOfKinRelation: formData.nextOfKinRelation,
        notes: formData.notes || null,
        guarantor: formData.guarantorName ? {
          fullName: formData.guarantorName,
          phone: formData.guarantorPhone,
          address: formData.guarantorAddress,
          occupation: formData.guarantorOccupation,
          ghanaCardNumber: formData.guarantorGhanaCard,
          relationship: formData.guarantorRelationship,
        } : null,
      };

      const res = await api.post('/clients', payload);
      if (res.success) {
        setSuccessMsg(`Client ${res.data.clientId} registered successfully!`);
        setTimeout(() => {
          setRegisterModalOpen(false);
          setSuccessMsg('');
          fetchClients();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">Client Directory</h2>
          <p className="text-xs text-slate-500">
            Registered borrowers, KYC Ghana Card records, and account profiles in Wassa Powuako.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setSuccessMsg('');
            setRegisterModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          Register New Client
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Client ID, Name, Phone, or Ghana Card..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Showing <span className="text-navy-950 font-bold">{clients.length}</span> of {total} clients
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Client ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Ghana Card</th>
                <th className="py-3 px-4">Occupation</th>
                <th className="py-3 px-4">Active Loan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading clients...</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No client records found matching search.</td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-extrabold text-brand-700">{c.clientId}</td>
                    <td className="py-3 px-4 font-bold text-navy-950">{c.fullName}</td>
                    <td className="py-3 px-4 text-slate-600">{c.phone}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{c.ghanaCardNumber}</td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]">{c.occupation}</td>
                    <td className="py-3 px-4">
                      {c.hasActiveLoan ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                          {c.activeLoanAccount} (GH₵ {Number(c.activeLoanOutstanding).toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenProfile(c.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 font-bold rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      <Modal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        title="Register New Client (KYC & Guarantor Details)"
        maxWidth="max-w-3xl"
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

        <form onSubmit={handleRegisterSubmit} className="space-y-6 text-xs">
          {/* Section 1: Personal Details */}
          <div>
            <h4 className="font-bold text-navy-950 text-sm mb-3 pb-1 border-b border-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-brand-600" />
              1. Client Personal Identification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name (as on Ghana Card) *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Kwame Asante"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghana Card PIN *</label>
                <input
                  type="text"
                  required
                  value={formData.ghanaCardNumber}
                  onChange={(e) => setFormData({ ...formData, ghanaCardNumber: e.target.value })}
                  placeholder="GHA-123456789-0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (MoMo Enabled) *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0245567890"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alternative Phone Number</label>
                <input
                  type="tel"
                  value={formData.altPhone}
                  onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                  placeholder="0501234567"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Residential Address *</label>
                <input
                  type="text"
                  required
                  value={formData.residentialAddress}
                  onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                  placeholder="House No. WP-24, Near Powuako Station"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Community / Town</label>
                <input
                  type="text"
                  value={formData.communityTown}
                  onChange={(e) => setFormData({ ...formData, communityTown: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Occupation / Business *</label>
                <input
                  type="text"
                  required
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  placeholder="e.g. Cocoa Farmer, Provisions Shopkeeper"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Employer / Business Store Name</label>
                <input
                  type="text"
                  value={formData.employerBusinessName}
                  onChange={(e) => setFormData({ ...formData, employerBusinessName: e.target.value })}
                  placeholder="e.g. Nyame Nti Wholesale Store"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Next of Kin */}
          <div>
            <h4 className="font-bold text-navy-950 text-sm mb-3 pb-1 border-b border-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-600" />
              2. Next of Kin Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Next of Kin Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.nextOfKinName}
                  onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Next of Kin Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.nextOfKinPhone}
                  onChange={(e) => setFormData({ ...formData, nextOfKinPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Relationship</label>
                <input
                  type="text"
                  value={formData.nextOfKinRelation}
                  onChange={(e) => setFormData({ ...formData, nextOfKinRelation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Guarantor Details */}
          <div>
            <h4 className="font-bold text-navy-950 text-sm mb-3 pb-1 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gold-500" />
              3. Primary Guarantor Details (Optional at Registration)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Guarantor Full Name</label>
                <input
                  type="text"
                  value={formData.guarantorName}
                  onChange={(e) => setFormData({ ...formData, guarantorName: e.target.value })}
                  placeholder="e.g. Patrick Agyeman"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Guarantor Phone</label>
                <input
                  type="tel"
                  value={formData.guarantorPhone}
                  onChange={(e) => setFormData({ ...formData, guarantorPhone: e.target.value })}
                  placeholder="0240000000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Guarantor Ghana Card</label>
                <input
                  type="text"
                  value={formData.guarantorGhanaCard}
                  onChange={(e) => setFormData({ ...formData, guarantorGhanaCard: e.target.value })}
                  placeholder="GHA-000000000-0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRegisterModalOpen(false)}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Save & Register Client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Profile Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title={selectedClient ? `${selectedClient.fullName} (${selectedClient.clientId})` : 'Client Profile'}
        maxWidth="max-w-4xl"
      >
        {profileLoading || !selectedClient ? (
          <div className="py-12 text-center text-slate-400">Loading full client record...</div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                <span className="font-bold text-navy-950">{selectedClient.phone}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Ghana Card</span>
                <span className="font-bold text-navy-950 font-mono">{selectedClient.ghanaCardNumber}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                <span className="font-bold text-navy-950 truncate block">{selectedClient.residentialAddress}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                <StatusBadge status={selectedClient.status} />
              </div>
            </div>

            {/* Guarantors Section */}
            <div>
              <h4 className="font-bold text-navy-950 mb-2">Registered Guarantors</h4>
              <div className="space-y-2">
                {selectedClient.guarantors?.length === 0 ? (
                  <p className="text-slate-400 italic">No guarantors attached yet.</p>
                ) : (
                  selectedClient.guarantors.map((g) => (
                    <div key={g.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-navy-950 block">{g.fullName} ({g.relationship})</span>
                        <span className="text-slate-600">Phone: {g.phone} | Card: {g.ghanaCardNumber}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        Liability Vetted
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Loan Facilities History */}
            <div>
              <h4 className="font-bold text-navy-950 mb-2">Loan Facilities History</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Loan Account</th>
                      <th className="py-2 px-3">Facility</th>
                      <th className="py-2 px-3">Principal</th>
                      <th className="py-2 px-3">Outstanding</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedClient.loans?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">No loan records on file</td>
                      </tr>
                    ) : (
                      selectedClient.loans.map((l) => (
                        <tr key={l.id}>
                          <td className="py-2.5 px-3 font-bold text-brand-700">{l.loanAccountNumber}</td>
                          <td className="py-2.5 px-3">{l.product.name}</td>
                          <td className="py-2.5 px-3 font-bold">GH₵ {Number(l.principalAmount).toFixed(2)}</td>
                          <td className="py-2.5 px-3 font-bold text-rose-700">GH₵ {Number(l.totalOutstanding).toFixed(2)}</td>
                          <td className="py-2.5 px-3"><StatusBadge status={l.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

