import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(username, password);
      if (loggedUser.role === 'CLIENT') {
        setError('Access denied: Client logins are not permitted on this management system.');
        return;
      }
      if (loggedUser.role === 'STAFF' || loggedUser.role === 'LOAN_OFFICER' || loggedUser.role === 'CASHIER') {
        navigate('/portal/repayments');
      } else {
        navigate('/portal/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Invalid staff or administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 min-h-screen flex items-center justify-center p-4 antialiased">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 text-slate-950 font-black text-2xl shadow-xl shadow-emerald-500/20 mb-4 select-none">
            EF
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">EL-FAITH MICROFINANCE</h1>
          <p className="text-xs text-emerald-400 font-semibold tracking-wider uppercase mt-1">
            Wassa Powuako, Western Region, Ghana
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Financial Management & Loan Operations System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Staff & Executive Sign In</h2>
              <p className="text-xs text-slate-500">Access your branch workstation</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
              PHP v8.2
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username or Staff ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. ELIJAH or EF-ADM-001"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2 text-sm mt-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Management Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} EL-FAITH MICROFINANCE. All rights reserved.
        </div>
      </div>
    </div>
  );
};
