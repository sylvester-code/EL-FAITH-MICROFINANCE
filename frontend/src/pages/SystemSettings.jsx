import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  Volume2,
  VolumeX,
  Trash2,
} from 'lucide-react';
import { api } from '../api/client';
import { alarmAudio } from '../utils/alarmAudio';

export const SystemSettings = () => {
  const [settings, setSettings] = useState({
    companyName: 'EL-FAITH MICROFINANCE',
    branch: 'Wassa Powuako Branch',
    address: 'Main Commercial Road, Wassa Powuako',
    region: 'Western Region, Ghana',
    phone: '+233 24 556 7890 / +233 50 123 4567',
    email: 'info@elfaithmicrofinance.com',
    currency: 'GHS',
    currencySymbol: 'GH₵',
    operatingHours: 'Monday – Friday: 8:00 AM – 5:00 PM | Saturday: 9:00 AM – 2:00 PM',
    totalLoanAllocation: '500000.00',
  });

  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backupTriggering, setBackupTriggering] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [wipeoutData, setWipeoutData] = useState(null);
  const [wipeoutLoading, setWipeoutLoading] = useState(false);

  const fetchWipeout = async () => {
    try {
      const res = await api.get('/system/wipeout/status');
      if (res.success && res.data) {
        setWipeoutData(res.data);
      }
    } catch (e) {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, bRes] = await Promise.all([
        api.get('/system/settings'),
        api.get('/system/backups'),
      ]);
      if (sRes.success) setSettings(sRes.data);
      if (bRes.success) setBackups(bRes.data);
      await fetchWipeout();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchWipeout, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleInitiateWipeout = async () => {
    const confirmed = window.confirm(
      '🚨 CRITICAL EMERGENCY ACTION:\n\nAre you sure you want to initiate an ENTIRE SYSTEM WIPEOUT?\n\n- The deletion will take 40 DAYS before going through.\n- The system will sound a CONTINUOUS EMERGENCY AUDIO ALARM until you stop it.\n- You can cancel/abort the wipeout at any time during the 40-day countdown.'
    );
    if (!confirmed) return;

    setWipeoutLoading(true);
    try {
      const res = await api.post('/system/wipeout/schedule');
      if (res.success) {
        alarmAudio.start();
        await fetchWipeout();
        alert('Entire System Wipeout initiated. 40-day countdown started and audio alarm is active.');
      }
    } catch (err) {
      alert('Failed to initiate wipeout: ' + err.message);
    } finally {
      setWipeoutLoading(false);
    }
  };

  const handleStopAlarm = async () => {
    try {
      await api.post('/system/wipeout/stop-alarm');
      alarmAudio.stop();
      await fetchWipeout();
    } catch (err) {
      alert('Error stopping alarm: ' + err.message);
    }
  };

  const handleCancelWipeout = async () => {
    if (!window.confirm('Are you sure you want to abort the scheduled 40-day system wipeout?')) return;
    try {
      await api.post('/system/wipeout/cancel');
      alarmAudio.stop();
      await fetchWipeout();
      alert('System wipeout aborted. Alarm stopped and normal operations continue.');
    } catch (err) {
      alert('Error cancelling wipeout: ' + err.message);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.post('/system/settings', {
        COMPANY_NAME: settings.companyName,
        COMPANY_BRANCH: settings.branch,
        COMPANY_ADDRESS: settings.address,
        COMPANY_REGION: settings.region,
        COMPANY_PHONE: settings.phone,
        COMPANY_EMAIL: settings.email,
        COMPANY_CURRENCY: settings.currency,
        COMPANY_CURRENCY_SYMBOL: settings.currencySymbol,
        OPERATING_HOURS: settings.operatingHours,
        TOTAL_LOAN_ALLOCATION: settings.totalLoanAllocation,
      });
      setSuccessMsg('Company configuration saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update settings');
    }
  };

  const handleTriggerBackup = async () => {
    setBackupTriggering(true);
    try {
      const res = await api.post('/system/backup', {});
      if (res.success) {
        alert(`Backup generated: ${res.data.fileName} (${res.data.sizeKb} KB)`);
        fetchData();
      }
    } catch (err) {
      alert('Backup failed: ' + err.message);
    } finally {
      setBackupTriggering(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">System Settings & Database Backups</h2>
        <p className="text-xs text-slate-500">
          Corporate organization branding, branch office parameters, currency configuration, and automated database backups.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Settings Form */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="text-base font-bold text-navy-950 mb-1 flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-600" />
            Company & Branch Parameters
          </h3>
          <p className="text-xs text-slate-400 mb-6">These parameters reflect on receipts, loan vouchers, and certificates.</p>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  value={settings.branch}
                  onChange={(e) => setSettings({ ...settings, branch: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Physical Office Address</label>
                <input
                  type="text"
                  required
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Region / Location</label>
                <input
                  type="text"
                  required
                  value={settings.region}
                  onChange={(e) => setSettings({ ...settings, region: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Phone Lines</label>
                <input
                  type="text"
                  required
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Currency Code</label>
                <input
                  type="text"
                  required
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  required
                  value={settings.currencySymbol}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Business Operating Hours</label>
              <input
                type="text"
                required
                value={settings.operatingHours}
                onChange={(e) => setSettings({ ...settings, operatingHours: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Total Loan Capital Allocation (GH₵)
              </label>
              <p className="text-[11px] text-slate-500 mb-1">
                Super Admin ceiling on maximum cumulative gross loans that can be disbursed.
              </p>
              <input
                type="number"
                step="500"
                required
                value={settings.totalLoanAllocation || ''}
                onChange={(e) => setSettings({ ...settings, totalLoanAllocation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold text-navy-950 font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all text-xs"
              >
                <Save className="w-4 h-4 text-gold-400" />
                Save System Parameters
              </button>
            </div>
          </form>
        </div>

        {/* Database Backups Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-navy-950 flex items-center gap-2">
                  <Database className="w-4 h-4 text-brand-600" />
                  Database Snapshot Backups
                </h3>
                <p className="text-xs text-slate-400">Automated JSON & SQL snapshots</p>
              </div>
              <button
                onClick={handleTriggerBackup}
                disabled={backupTriggering}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy-950 hover:bg-navy-900 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-gold-400 ${backupTriggering ? 'animate-spin' : ''}`} />
                {backupTriggering ? 'Dumping...' : 'Trigger Backup'}
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto text-xs">
              {backups.length === 0 ? (
                <p className="text-slate-400 text-center py-6">No snapshots saved yet.</p>
              ) : (
                backups.map((b, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-navy-950 block font-mono text-[11px] truncate max-w-[200px]">
                        {b.fileName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Size: {b.sizeKb} KB | {new Date(b.createdAt).toLocaleString('en-GB')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Protected
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recovery Instructions Card */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-white/10 text-white text-xs space-y-3">
            <div className="flex items-center gap-2 text-gold-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Disaster Recovery Procedures</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Snapshots contain full normalized exports of branches, users, loans, schedules, and repayments. To restore:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-slate-300 text-[11px]">
              <li>Ensure MySQL service is active on 127.0.0.1:3306.</li>
              <li>Execute Prisma migration: <code className="bg-black/40 px-1 py-0.5 rounded text-gold-300">npm run prisma:push</code></li>
              <li>Re-import snapshot from <code className="bg-black/40 px-1 py-0.5 rounded text-gold-300">backend/backups/</code> directory.</li>
            </ol>
          </div>

          {/* DANGER ZONE: 40-Day Entire System Wipeout Card */}
          <div className="bg-rose-50/70 p-6 rounded-2xl border-2 border-rose-300 text-xs space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Danger Zone: Entire System Wipeout</span>
              </div>
              {wipeoutData?.isPending ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 font-black text-[10px] animate-pulse">
                  40-DAY COUNTDOWN ACTIVE
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                  IDLE
                </span>
              )}
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              When triggered by the Super Administrator, the system initiates a mandatory <strong>40-day countdown</strong> before any deletion takes place. An emergency audio alarm sounds continuously until stopped by the Super Admin. You can abort the wipeout anytime during the 40 days.
            </p>

            {wipeoutData?.isPending ? (
              <div className="p-4 bg-white rounded-xl border border-rose-200 space-y-3">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Time Remaining Until Deletion Goes Through
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-1">
                    {wipeoutData.countdown?.days}d : {wipeoutData.countdown?.hours}h : {wipeoutData.countdown?.minutes}m : {wipeoutData.countdown?.seconds}s
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Scheduled Date: {new Date(wipeoutData.scheduledAt).toLocaleString('en-GB')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100">
                  {wipeoutData.alarmActive && (
                    <button
                      onClick={handleStopAlarm}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-navy-950 font-extrabold rounded-xl shadow-sm text-xs transition-all"
                    >
                      <VolumeX className="w-4 h-4" /> Stop Alarm Sound
                    </button>
                  )}
                  <button
                    onClick={handleCancelWipeout}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-xs transition-all"
                  >
                    Cancel 40-Day Wipeout
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  onClick={handleInitiateWipeout}
                  disabled={wipeoutLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md transition-all text-xs disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 text-gold-400" />
                  {wipeoutLoading ? 'Initiating 40-Day Wipeout...' : 'Initiate Entire System Wipeout (40 Days)'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

