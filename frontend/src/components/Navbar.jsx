import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Landmark, Menu, X, ArrowRight, ShieldCheck, User, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand Identity */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-900 to-navy-950 flex items-center justify-center text-white shadow-md shadow-brand-950/20">
              <Landmark className="w-7 h-7 text-gold-400" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-navy-950 block leading-tight">
                EL-FAITH <span className="text-brand-600">MICROFINANCE</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest block">
                Wassa Powuako, Western Region
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#about" className="hover:text-brand-700 transition-colors">About Us</a>
            <a href="#products" className="hover:text-brand-700 transition-colors">Loan Products</a>
            <a href="#calculator" className="hover:text-brand-700 transition-colors">Loan Calculator</a>
            <a href="#how-it-works" className="hover:text-brand-700 transition-colors">How It Works</a>
            <a href="#faqs" className="hover:text-brand-700 transition-colors">FAQs</a>
            <a href="#contact" className="hover:text-brand-700 transition-colors">Contact</a>
          </nav>

          {/* Action Portals */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/portal/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-lg shadow-sm transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-gold-400" />
                  Go to Portal ({user.role.replace('_', ' ')})
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login?portal=client"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-brand-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4 text-brand-600" />
                  Client Login
                </Link>
                <Link
                  to="/login?portal=staff"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-brand-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Lock className="w-4 h-4 text-brand-600" />
                  Staff Login
                </Link>
                <a
                  href="#calculator"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-navy-950 hover:bg-navy-900 rounded-lg shadow-sm transition-all"
                >
                  Apply for Loan
                  <ArrowRight className="w-4 h-4 text-gold-400" />
                </a>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3">
          <a
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            About Us
          </a>
          <a
            href="#products"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Loan Products
          </a>
          <a
            href="#calculator"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Loan Calculator
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            How It Works
          </a>
          <a
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Contact & Office
          </a>
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <Link
              to="/login?portal=client"
              className="block w-full text-center px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 rounded-lg"
            >
              Client Login
            </Link>
            <Link
              to="/login?portal=staff"
              className="block w-full text-center px-4 py-2.5 text-sm font-bold text-white bg-navy-950 rounded-lg"
            >
              Staff & Admin Portal
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

