import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Landmark,
  LayoutDashboard,
  Users,
  ShieldCheck,
  UserCheck,
  Package,
  FileText,
  Banknote,
  Receipt,
  AlertTriangle,
  BookOpen,
  DollarSign,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Building,
  Calculator,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { alarmAudio } from '../utils/alarmAudio';

export const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const [wipeoutStatus, setWipeoutStatus] = useState(null);

  const fetchWipeout = async () => {
    try {
      const res = await api.get('/system/wipeout/status');
      if (res.success && res.data) {
        setWipeoutStatus(res.data);
        if (res.data.isPending && res.data.alarmActive) {
          alarmAudio.start();
        } else {
          alarmAudio.stop();
        }
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchWipeout();
    const interval = setInterval(fetchWipeout, 3000);
    return () => {
      clearInterval(interval);
      alarmAudio.stop();
    };
  }, []);

  const handleStopAlarm = async () => {
    try {
      await api.post('/system/wipeout/stop-alarm');
      alarmAudio.stop();
      fetchWipeout();
    } catch (e) {
      alert('Error stopping alarm: ' + e.message);
    }
  };

  const handleCancelWipeout = async () => {
    if (!window.confirm('Are you sure you want to abort the scheduled 40-day system wipeout?')) return;
    try {
      await api.post('/system/wipeout/cancel');
      alarmAudio.stop();
      fetchWipeout();
    } catch (e) {
      alert('Error cancelling wipeout: ' + e.message);
    }
  };

  const isExecutive = hasRole('SUPER_ADMIN', 'CEO');

  // Define nav links for management & staff operations
  // Policy: Regular staff can ONLY Register Client and Receive / Key In Payment
  const navLinks = (isExecutive
    ? [
        {
          label: 'Dashboard',
          path: '/portal/dashboard',
          icon: LayoutDashboard,
          visible: true,
        },
        {
          label: 'Staff Management',
          path: '/portal/staff',
          icon: Users,
          visible: hasRole('SUPER_ADMIN'),
        },
        {
          label: 'Client Directory',
          path: '/portal/clients',
          icon: UserCheck,
          visible: true,
        },
        {
          label: 'Loan Calculator',
          path: '/portal/calculator',
          icon: Calculator,
          visible: true,
        },
        {
          label: 'Loan Products (10%)',
          path: '/portal/products',
          icon: Package,
          visible: true,
        },
        {
          label: 'Loan Applications',
          path: '/portal/applications',
          icon: FileText,
          visible: true,
        },
        {
          label: 'Disbursements',
          path: '/portal/disbursements',
          icon: Banknote,
          visible: true,
        },
        {
          label: 'Repayments & Receipts',
          path: '/portal/repayments',
          icon: Receipt,
          visible: true,
        },
        {
          label: 'Overdue & Recovery',
          path: '/portal/overdue',
          icon: AlertTriangle,
          visible: true,
        },
        {
          label: 'Cashbook & Accounts',
          path: '/portal/cashbook',
          icon: BookOpen,
          visible: true,
        },
        {
          label: 'Operational Expenses',
          path: '/portal/expenses',
          icon: DollarSign,
          visible: true,
        },
        {
          label: 'Audit & Compliance Logs',
          path: '/portal/audit-logs',
          icon: History,
          visible: true,
        },
        {
          label: 'Settings & Backups',
          path: '/portal/settings',
          icon: Settings,
          visible: hasRole('SUPER_ADMIN'),
        },
      ]
    : [
        {
          label: 'Receive & Key In Payment',
          path: '/portal/repayments',
          icon: Receipt,
          visible: true,
        },
        {
          label: 'Register Client',
          path: '/portal/clients',
          icon: UserCheck,
          visible: true,
        },
      ]
  ).filter((item) => item.visible);

  const roleColors = {
    SUPER_ADMIN: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    CEO: 'bg-gold-500/20 text-gold-300 border-gold-500/30',
    BRANCH_MANAGER: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    LOAN_OFFICER: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
    CASHIER: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    ACCOUNTANT: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    AUDITOR: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    CUSTOMER_SERVICE: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop - Static & Pinned */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-slate-300 shrink-0 border-r border-slate-800 sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3 bg-slate-900">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg select-none">
            EF
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-none">
              EL-FAITH <span className="text-emerald-400">MICROFINANCE</span>
            </h1>
            <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider mt-1">
              Wassa Powuako, Ghana
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm shadow">
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'E'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user?.fullName || user?.username}</p>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mt-0.5">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          <p className="px-2 text-[10px] font-bold tracking-wider uppercase text-slate-500 mb-2">
            {isExecutive ? 'Executive Operations' : 'Staff Workstation'}
          </p>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full hidden sm:inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Wassa Powuako Branch
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-black text-slate-900 leading-tight">{user?.fullName || user?.username}</p>
              <p className="text-[10px] text-slate-500 font-bold">
                {user?.role?.replace('_', ' ')} {user?.staffId ? `(${user.staffId})` : ''}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm shadow select-none">
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'E'}
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 40-Day System Wipeout Emergency Banner */}
        {wipeoutStatus?.isPending && (
          <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white px-4 py-3 shadow-lg border-b-2 border-rose-900">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-rose-900/80 rounded-xl text-yellow-300 animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <div className="font-black text-sm tracking-wide uppercase flex items-center gap-2 text-white">
                    <span>🚨 CRITICAL: 40-DAY SYSTEM WIPEOUT IN PROGRESS</span>
                    {wipeoutStatus.alarmActive && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-navy-950 font-black text-[10px] animate-pulse">
                        🔊 ALARM BEEPING
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-rose-100 mt-0.5">
                    Time until deletion goes through:{' '}
                    <strong className="font-mono text-yellow-300 text-xs">
                      {wipeoutStatus.countdown.days}d : {wipeoutStatus.countdown.hours}h : {wipeoutStatus.countdown.minutes}m : {wipeoutStatus.countdown.seconds}s
                    </strong>{' '}
                    (Scheduled for {new Date(wipeoutStatus.scheduledAt).toLocaleDateString('en-GB')})
                  </p>
                </div>
              </div>

              {hasRole('SUPER_ADMIN') && (
                <div className="flex items-center gap-2 shrink-0">
                  {wipeoutStatus.alarmActive && (
                    <button
                      onClick={handleStopAlarm}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-navy-950 font-black rounded-lg shadow transition-all text-xs"
                    >
                      <VolumeX className="w-4 h-4" /> Stop Alarm
                    </button>
                  )}
                  <button
                    onClick={handleCancelWipeout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-rose-700 font-black rounded-lg shadow transition-all text-xs"
                  >
                    Cancel Wipeout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-slate-900/60" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col p-4 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                    EF
                  </div>
                  <span className="font-bold text-white text-sm">EL-FAITH MICROFINANCE</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-4 space-y-1">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                        isActive ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 p-2.5 text-rose-400 text-xs font-bold border-t border-slate-800 pt-4"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
