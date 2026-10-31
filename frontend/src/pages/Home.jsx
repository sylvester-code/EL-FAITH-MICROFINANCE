import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Calculator,
  Building,
  Users,
  TrendingUp,
  PhoneCall,
  MapPin,
  ChevronDown,
  Sparkles,
  Send,
  HelpCircle,
  Award,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { api } from '../api/client';

export const Home = () => {
  // Calculator state
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calcAmount, setCalcAmount] = useState(5000);
  const [calcTerm, setCalcTerm] = useState(6);
  const [calcResult, setCalcResult] = useState(null);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState(0);

  // Fetch loan products from backend
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products?activeOnly=true');
        if (res.success && res.data.length > 0) {
          setProducts(res.data);
          setSelectedProduct(res.data[0]);
          setCalcAmount(Number(res.data[0].minAmount) || 2000);
          setCalcTerm(res.data[0].minTermMonths || 3);
        }
      } catch (err) {
        console.error('Error fetching loan products:', err);
      }
    };
    fetchProducts();
  }, []);

  // Update calculator whenever product, amount or term changes
  useEffect(() => {
    if (!selectedProduct) return;

    const principal = Number(calcAmount);
    const rate = Number(selectedProduct.defaultInterestRate);
    const months = Number(calcTerm);
    const procRate = Number(selectedProduct.processingFeeRate || 2.5);
    const insRate = Number(selectedProduct.insuranceFeeRate || 1.0);

    const procFee = (principal * procRate) / 100;
    const insFee = (principal * insRate) / 100;
    const totalFees = procFee + insFee;
    const netDisbursement = principal - totalFees;

    let totalInterest = 0;
    let monthlyInstallment = 0;

    if (selectedProduct.interestMethod === 'FLAT_RATE') {
      totalInterest = principal * (rate / 100) * months;
      const totalRepayable = principal + totalInterest;
      monthlyInstallment = totalRepayable / months;
    } else {
      // Amortized reducing balance
      const r = rate / 100;
      const pmt = (principal * (r * Math.pow(1 + r, months))) / (Math.pow(1 + r, months) - 1);
      monthlyInstallment = pmt;
      totalInterest = monthlyInstallment * months - principal;
    }

    setCalcResult({
      principal,
      totalInterest,
      totalFees,
      netDisbursement,
      totalRepayable: principal + totalInterest,
      monthlyInstallment,
      rate,
      interestMethod: selectedProduct.interestMethod,
    });
  }, [selectedProduct, calcAmount, calcTerm]);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/system/complaints', {
        clientId: 1, // General inquiry
        subject: `Website Inquiry: ${contactSubject || 'General Information'}`,
        description: `From: ${contactName} (${contactPhone})\nMessage: ${contactMessage}`,
        priority: 'MEDIUM',
      });
      setContactSent(true);
      setContactName('');
      setContactPhone('');
      setContactSubject('');
      setContactMessage('');
    } catch (err) {
      alert('Unable to send inquiry: ' + err.message);
    }
  };

  const faqs = [
    {
      q: 'Where is EL-FAITH MICROFINANCE located?',
      a: 'Our main operational branch is centrally located on the Main Commercial Road, Wassa Powuako, Western Region, Ghana (near the Powuako Central Mosque and Station).',
    },
    {
      q: 'What requirements do I need to apply for a loan?',
      a: 'To apply, you require a valid Ghana Card, two passport-sized photographs, proof of business or employment in Wassa Powuako or surrounding communities, and at least one vetted guarantor with a valid Ghana Card.',
    },
    {
      q: 'How long does loan appraisal and disbursement take?',
      a: 'Most emergency and business loans are appraised and disbursed within 24 to 48 hours following document verification and guarantor vetting.',
    },
    {
      q: 'Can I repay my loan via Mobile Money (MoMo)?',
      a: 'Yes! We accept repayments through Cash at our Wassa Powuako branch tellers, MTN Mobile Money, and Telecel Cash. Every confirmed payment generates an authentic system-generated PDF receipt with a unique receipt number.',
    },
    {
      q: 'Can I settle my loan early before the agreed maturity date?',
      a: 'Absolutely. We encourage early loan settlement and provide instant loan clearance certificates upon final payment with zero penalty fees.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-brand-950 to-navy-950 text-white pt-20 pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(12,135,235,0.15),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-400/30 text-gold-400 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Premier Microfinance Institution in Wassa Powuako, Western Region</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Empowering Your Business & Dreams with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-brand-400 to-gold-400">Faithful Credit.</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Fast, dependable, and transparent microcredit services for cocoa farmers, market traders, store owners, and salaried workers across Wassa Powuako and the Western Region of Ghana.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href="#calculator"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-bold text-navy-950 bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-500 hover:to-amber-600 rounded-xl shadow-lg shadow-gold-500/20 transition-all transform hover:-translate-y-0.5"
                >
                  <Calculator className="w-5 h-5" />
                  Estimate Your Loan Repayment
                </a>
                <a
                  href="#contact"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all"
                >
                  <MapPin className="w-4 h-4 text-brand-300" />
                  Visit Powuako Office
                </a>
              </div>

              {/* Badges bar */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-white/10 max-w-lg mx-auto lg:mx-0 text-left">
                <div>
                  <span className="text-2xl font-black text-white block">24 – 48 hrs</span>
                  <span className="text-xs text-slate-400">Fast Disbursement</span>
                </div>
                <div>
                  <span className="text-2xl font-black text-white block">GH₵ 300+</span>
                  <span className="text-xs text-slate-400">Accessible Starting Credit</span>
                </div>
                <div>
                  <span className="text-2xl font-black text-white block">100% Secure</span>
                  <span className="text-xs text-slate-400">Audited Financial Ledger</span>
                </div>
              </div>
            </div>

            {/* Quick Hero Floating Card */}
            <div className="lg:col-span-5">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 text-white shadow-2xl relative">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                      <Landmark className="w-6 h-6 text-gold-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">EL-FAITH MICROFINANCE</h3>
                      <p className="text-xs text-brand-300">Wassa Powuako Branch</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                    Licensed Operations
                  </span>
                </div>

                <div className="py-5 space-y-3">
                  <div className="flex justify-between text-xs py-1.5 border-b border-white/5">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-semibold text-slate-200">Wassa Powuako, Western Region</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-white/5">
                    <span className="text-slate-400">Available Facilities:</span>
                    <span className="font-semibold text-slate-200">Business, Personal, Emergency, Susu</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-white/5">
                    <span className="text-slate-400">Repayment Channels:</span>
                    <span className="font-semibold text-slate-200">Cash, MTN MoMo, Telecel Cash</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-slate-400">Operating Days:</span>
                    <span className="font-semibold text-gold-400">Mon – Fri (8am-5pm), Sat (9am-2pm)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/login?portal=staff"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Staff & Management Portal Access <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold tracking-widest text-brand-600 uppercase">Who We Are</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
              About EL-FAITH MICROFINANCE
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
              Founded to bridge the financial inclusion gap in Wassa Powuako and the broader Western Region of Ghana, EL-FAITH MICROFINANCE delivers ethical, community-driven microcredit and business capital. We support micro-entrepreneurs, cocoa farmers, retail traders, and salaried employees with fair credit structures, personal attention, and transparent accounting.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-6">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-950 mb-2">Deep Community Roots</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Operating directly within Wassa Powuako, we understand the local cocoa farming cycles, seasonal market trading dynamics, and economic realities of our borrowers.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-950 mb-2">Dignified & Fair Credit</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                We believe in ethical lending with clearly declared interest rates, transparent fee structures, and respectful customer-oriented recovery practices.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-950 mb-2">Digitized Financial Operations</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Powered by a centralized, decimal-safe loan management system that ensures every cedi disbursed and collected is backed by verified receipts and instant ledger audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Loan Products Section */}
      <section id="products" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold tracking-widest text-brand-600 uppercase">Tailored Financial Products</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
              Designed for Your Growth & Needs
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Choose from our range of verified loan facilities structured to suit diverse business sizes and family requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-slate-50/70 hover:bg-white rounded-2xl p-7 border border-slate-200 hover:border-brand-300 hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-brand-100 text-brand-800 rounded-full text-xs font-bold tracking-wide">
                      {p.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      {p.interestMethod.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-navy-950 mb-2">{p.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">{p.description}</p>

                  <div className="space-y-3 py-4 border-t border-b border-slate-200/80 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Loan Range:</span>
                      <span className="font-bold text-navy-950">GH₵ {Number(p.minAmount).toLocaleString()} – GH₵ {Number(p.maxAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Indicative Rate:</span>
                      <span className="font-bold text-brand-700">{p.defaultInterestRate}% / Month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Repayment Period:</span>
                      <span className="font-bold text-navy-950">{p.minTermMonths} to {p.maxTermMonths} Months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Frequency:</span>
                      <span className="font-bold text-navy-950">{p.repaymentFrequency}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <a
                    href="#calculator"
                    onClick={() => {
                      setSelectedProduct(p);
                      setCalcAmount(Number(p.minAmount));
                      setCalcTerm(p.minTermMonths);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-600 hover:text-white transition-all border border-brand-200"
                  >
                    Select & Calculate in Widget <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Live Loan Calculator Section */}
      <section id="calculator" className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold tracking-widest text-gold-400 uppercase">Transparency First</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Interactive Loan Repayment Calculator
            </h2>
            <p className="text-slate-300 text-sm">
              Use our live calculation engine to see exact estimates of monthly installments, interest, and net payout before applying.
            </p>
          </div>

          <div className="bg-navy-950/90 rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Controls Column */}
              <div className="md:col-span-7 space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Select Loan Product
                  </label>
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === parseInt(e.target.value, 10));
                      if (prod) {
                        setSelectedProduct(prod);
                        setCalcAmount(Number(prod.minAmount));
                        setCalcTerm(prod.minTermMonths);
                      }
                    }}
                    className="w-full bg-slate-800 text-white text-sm rounded-xl px-4 py-3 border border-slate-700 focus:outline-none focus:border-brand-500 font-medium"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.defaultInterestRate}% / Month - {p.interestMethod.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Loan Amount (GH₵)
                    </label>
                    <span className="text-base font-extrabold text-gold-400">
                      GH₵ {Number(calcAmount).toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={selectedProduct ? Number(selectedProduct.minAmount) : 500}
                    max={selectedProduct ? Number(selectedProduct.maxAmount) : 50000}
                    step={100}
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-gold-400"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Min: GH₵ {selectedProduct ? Number(selectedProduct.minAmount).toLocaleString() : '500'}</span>
                    <span>Max: GH₵ {selectedProduct ? Number(selectedProduct.maxAmount).toLocaleString() : '50,000'}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Repayment Duration (Months)
                    </label>
                    <span className="text-base font-extrabold text-gold-400">
                      {calcTerm} Month{calcTerm > 1 ? 's' : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={selectedProduct ? selectedProduct.minTermMonths : 1}
                    max={selectedProduct ? selectedProduct.maxTermMonths : 24}
                    step={1}
                    value={calcTerm}
                    onChange={(e) => setCalcTerm(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-gold-400"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Min: {selectedProduct ? selectedProduct.minTermMonths : 1} mo</span>
                    <span>Max: {selectedProduct ? selectedProduct.maxTermMonths : 24} mo</span>
                  </div>
                </div>
              </div>

              {/* Result Summary Box */}
              <div className="md:col-span-5 bg-gradient-to-br from-brand-900 to-navy-900 p-6 rounded-2xl border border-brand-500/30 text-white shadow-xl">
                <span className="text-[11px] font-bold uppercase tracking-widest text-brand-300 block mb-1">
                  Estimated Monthly Installment
                </span>
                <div className="text-3xl font-black text-gold-400 mb-4">
                  GH₵ {calcResult ? calcResult.monthlyInstallment.toFixed(2) : '0.00'}
                  <span className="text-xs font-normal text-slate-300 block mt-0.5">per month</span>
                </div>

                <div className="space-y-2.5 text-xs border-t border-white/10 pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Requested Principal:</span>
                    <span className="font-bold">GH₵ {calcResult ? calcResult.principal.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Processing & Ins. Fees:</span>
                    <span className="font-bold text-amber-300">- GH₵ {calcResult ? calcResult.totalFees.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-400">
                    <span>Net Disbursed to You:</span>
                    <span>GH₵ {calcResult ? calcResult.netDisbursement.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Total Interest Payable:</span>
                    <span className="font-bold">GH₵ {calcResult ? calcResult.totalInterest.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-white/10 pt-2 text-white">
                    <span>Total Repayment:</span>
                    <span className="text-gold-400">GH₵ {calcResult ? calcResult.totalRepayable.toFixed(2) : '0.00'}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <a
                    href="#contact"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-500 hover:to-amber-600 text-navy-950 rounded-xl text-xs font-extrabold shadow-md transition-all"
                  >
                    Apply for this Facility Now <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold tracking-widest text-brand-600 uppercase">Seamless Application</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
              Four Easy Steps to Receive Your Loan
            </h2>
            <p className="text-slate-600 text-sm">
              We make microcredit simple, transparent, and respectful of your valuable time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4 p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                1
              </div>
              <h3 className="text-base font-bold text-navy-950">Registration & KYC</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Provide your valid Ghana Card, residential address in Wassa Powuako, and business/employment information.
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-700 text-white flex items-center justify-center font-black text-xl shadow-md">
                2
              </div>
              <h3 className="text-base font-bold text-navy-950">Choose Loan Facility</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select your desired loan product, requested amount, repayment frequency, and attach your qualified guarantor.
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-800 text-white flex items-center justify-center font-black text-xl shadow-md">
                3
              </div>
              <h3 className="text-base font-bold text-navy-950">Appraisal & Approval</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our credit committee appraises your application promptly with objective affordability guidelines.
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                4
              </div>
              <h3 className="text-base font-bold text-navy-950">Instant Disbursement</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Receive your funds via Cash at our Wassa Powuako counter or directly to your MTN / Telecel Mobile Money wallet!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-14">
            <span className="text-xs font-bold tracking-widest text-brand-600 uppercase">Got Questions?</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((f, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between text-sm font-bold text-navy-950 hover:bg-slate-50 transition-colors"
                >
                  <span>{f.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-brand-600' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Office & Contact Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Contact Info & Office */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold tracking-widest text-brand-600 uppercase">Visit Our Office</span>
                <h2 className="text-3xl font-extrabold text-navy-950 tracking-tight mt-1">
                  We are in Wassa Powuako
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
                  Visit our welcoming branch for in-person consultations, loan applications, cash disbursements, and repayments.
                </p>
              </div>

              <div className="space-y-4 text-xs text-slate-700">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-navy-950 block text-sm">Physical Office Address:</span>
                    <span>Main Commercial Road, Near Powuako Central Mosque, Wassa Powuako, Western Region, Ghana</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <PhoneCall className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-navy-950 block text-sm">Phone Customer Lines:</span>
                    <span>+233 24 556 7890 / +233 50 123 4567</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-navy-950 block text-sm">Business Operating Hours:</span>
                    <span>Monday – Friday: 8:00 AM – 5:00 PM</span>
                    <span className="block">Saturday: 9:00 AM – 2:00 PM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Contact & Inquiry Form */}
            <div className="lg:col-span-7 bg-slate-50 p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-navy-950 mb-1">Send Us a Direct Message</h3>
              <p className="text-xs text-slate-500 mb-6">
                Have a question regarding loan requirements or repayments? Fill out this form and our customer officers will reach out.
              </p>

              {contactSent ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-emerald-900 text-base">Inquiry Successfully Received!</h4>
                  <p className="text-xs text-emerald-700">
                    Thank you for reaching out to EL-FAITH MICROFINANCE. A customer officer from our Wassa Powuako branch will contact you shortly.
                  </p>
                  <button
                    onClick={() => setContactSent(false)}
                    className="mt-3 text-xs font-bold text-emerald-800 underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Kwabena Mensah"
                        className="w-full bg-white text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="e.g. 0245567890"
                        className="w-full bg-white text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Inquiry Subject / Facility of Interest</label>
                    <input
                      type="text"
                      required
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="e.g. Business Growth Loan Inquiry"
                      className="w-full bg-white text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Message / Question</label>
                    <textarea
                      rows={4}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Tell us about your business or financing needs..."
                      className="w-full bg-white text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4 text-gold-400" />
                    Submit Inquiry to Powuako Branch
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

