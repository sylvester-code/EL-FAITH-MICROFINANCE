import React from 'react';
import { Link } from 'react-router-dom';
import { Landmark, MapPin, Phone, Mail, Clock, ShieldCheck } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-navy-950 text-white pt-16 pb-12 border-t border-navy-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-navy-900">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <Landmark className="w-6 h-6 text-gold-400" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white block">
                  EL-FAITH <span className="text-brand-400">MICROFINANCE</span>
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block">
                  Wassa Powuako Branch
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Empowering local businesses, cocoa farmers, market traders, and salaried workers across Wassa Powuako and the Western Region of Ghana with accessible, transparent, and dignified financial credit facilities.
            </p>
            <div className="flex items-center gap-2 text-xs text-gold-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Registered Financial Operations & Microcredit</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">Quick Navigation</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><a href="#about" className="hover:text-white transition-colors">About EL-FAITH</a></li>
              <li><a href="#products" className="hover:text-white transition-colors">Loan Products</a></li>
              <li><a href="#calculator" className="hover:text-white transition-colors">Loan Calculator</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How to Apply</a></li>
              <li><a href="#faqs" className="hover:text-white transition-colors">Customer FAQs</a></li>
              <li><Link to="/login?portal=client" className="text-brand-400 hover:text-brand-300 font-semibold">Client Portal</Link></li>
              <li><Link to="/login?portal=staff" className="text-brand-400 hover:text-brand-300 font-semibold">Staff & Admin Login</Link></li>
            </ul>
          </div>

          {/* Operating Hours */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">Operating Hours</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200 block">Monday – Friday:</span>
                  <span>8:00 AM – 5:00 PM</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200 block">Saturday:</span>
                  <span>9:00 AM – 2:00 PM</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200 block">Sunday & Public Holidays:</span>
                  <span className="text-slate-500">Closed</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">Office & Location</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200 block">Office Location:</span>
                  <span>Main Commercial Road, Wassa Powuako, Western Region, Ghana</span>
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-brand-400 shrink-0" />
                <span>+233 24 556 7890 / +233 50 123 4567</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-brand-400 shrink-0" />
                <span>info@elfaithmicrofinance.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} EL-FAITH MICROFINANCE. All Rights Reserved. Wassa Powuako, Ghana.</p>
          <div className="flex gap-6">
            <a href="#about" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#about" className="hover:text-slate-300">Terms & Conditions</a>
            <a href="#contact" className="hover:text-slate-300">Client Fair Lending Notice</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

