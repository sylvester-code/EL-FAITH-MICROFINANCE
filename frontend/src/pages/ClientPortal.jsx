import React, { useState, useEffect } from 'react';
import {
  User,
  CreditCard,
  Calendar,
  Receipt,
  Download,
  AlertCircle,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { StatusBadge } from '../components/Badge';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const ClientPortal = () => {
  const { user } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientProfile = async () => {
      setLoading(true);
      try {
        // If client user is logged in, their clientDbId or clientId is attached to auth object
        const targetId = user?.clientDbId || user?.clientId || 1;
        const res = await api.get(`/clients/${targetId}`);
        if (res.success) {
          setClientData(res.data);
        }
      } catch (err) {
        console.error('Error fetching client profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClientProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading your personal account details...</p>
        </div>
      </div>
    );
  }

  const activeLoan = clientData?.loans?.find((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE') || clientData?.loans?.[0];
  const schedules = activeLoan?.repaymentSchedules || [];
  const repayments = activeLoan?.repayments || [];

  return (
    <div className="space-y-8">
      {/* Client Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-brand-950 to-navy-900 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
            EL-FAITH Verified Client
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1">
            Hello, {clientData?.fullName || user?.fullName}!
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Client ID: <span className="font-bold text-gold-400 font-mono">{clientData?.clientId}</span> | Branch: Wassa Powuako
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Credit Officer</span>
          <span className="font-bold text-xs text-white block">
            {clientData?.assignedOfficer?.staffProfile?.fullName || 'Wassa Powuako Branch Staff'}
          </span>
          <span className="text-[11px] text-gold-400 font-semibold">
            {clientData?.assignedOfficer?.staffProfile?.phone || '+233 24 556 7890'}
          </span>
        </div>
      </div>

      {/* Active Facility Status Card */}
      {activeLoan ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Facility Name</span>
            <span className="text-base font-extrabold text-navy-950 block mt-1">{activeLoan.product?.name}</span>
            <span className="text-xs text-brand-600 font-mono font-bold mt-0.5 block">{activeLoan.loanAccountNumber}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Initial Principal</span>
            <span className="text-xl font-black text-navy-950 block mt-1">
              GH₵ {Number(activeLoan.principalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              Term: {activeLoan.termMonths} Months ({activeLoan.repaymentFrequency})
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Repaid So Far</span>
            <span className="text-xl font-black text-emerald-600 block mt-1">
              GH₵ {Number(activeLoan.totalPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              Principal Repaid: GH₵ {Number(activeLoan.totalPrincipalPaid).toFixed(2)}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Current Balance Outstanding</span>
            <span className="text-xl font-black text-rose-600 block mt-1">
              GH₵ {Number(activeLoan.totalOutstanding).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <div className="mt-1">
              <StatusBadge status={activeLoan.status} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-brand-600 mx-auto" />
          <h3 className="text-base font-bold text-navy-950">No Active Loan Obligations</h3>
          <p className="text-xs text-slate-500">
            You do not currently have any active loans. You may apply for a new facility anytime at our Wassa Powuako branch!
          </p>
        </div>
      )}

      {/* Repayment Schedule Table */}
      {schedules.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              Repayment Schedule Breakdown
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold">
              Monthly Installments Due
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Principal Due</th>
                  <th className="py-2.5 px-4">Interest Due</th>
                  <th className="py-2.5 px-4">Total Installment</th>
                  <th className="py-2.5 px-4">Paid</th>
                  <th className="py-2.5 px-4">Remaining Balance</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-400">{s.installmentNumber}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {new Date(s.dueDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">GH₵ {Number(s.principalDue).toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-slate-600">GH₵ {Number(s.interestDue).toFixed(2)}</td>
                    <td className="py-2.5 px-4 font-extrabold text-navy-950">
                      GH₵ {Number(s.totalDue).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">
                      GH₵ {Number(s.totalPaid).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-rose-600">
                      GH₵ {Number(s.remainingBalance).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmed Payment Receipts */}
      {repayments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Downloadable Confirmed Receipts
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Receipt Number</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Amount Paid</th>
                  <th className="py-2.5 px-4">Channel</th>
                  <th className="py-2.5 px-4">Remaining Balance</th>
                  <th className="py-2.5 px-4 text-right">PDF Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repayments.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 px-4 font-bold text-navy-950 font-mono">{r.receiptNumber}</td>
                    <td className="py-2.5 px-4 text-slate-500">{new Date(r.paymentDate).toLocaleDateString('en-GB')}</td>
                    <td className="py-2.5 px-4 font-extrabold text-emerald-700">GH₵ {Number(r.amountPaid).toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-slate-600">{r.paymentMethod}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">GH₵ {Number(r.outstandingBalanceAfter).toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right">
                      {r.receiptPdfUrl && (
                        <a
                          href={r.receiptPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700 font-bold rounded-lg transition-colors text-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

