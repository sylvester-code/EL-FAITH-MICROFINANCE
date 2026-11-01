import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Calendar,
  Clock,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Banknote,
  DollarSign,
  Percent,
  FileText,
  Building,
} from 'lucide-react';

export const LoanCalculator = () => {
  const [principal, setPrincipal] = useState(5000);
  const [interestRate, setInterestRate] = useState(10); // 10% fixed per user policy
  const [termMonths, setTermMonths] = useState(6);
  const [interestMethod, setInterestMethod] = useState('FLAT_RATE');
  const [repaymentFrequency, setRepaymentFrequency] = useState('DAILY');
  const [processingFeeRate, setProcessingFeeRate] = useState(2.5);
  const [insuranceFeeRate, setInsuranceFeeRate] = useState(1.0);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Comparison matrix state
  const [allFrequencies, setAllFrequencies] = useState({});

  // Calculation results
  const [result, setResult] = useState(null);

  // Compute breakdown for all frequencies (Daily, Weekly, Fortnightly, Monthly)
  useEffect(() => {
    const p = parseFloat(principal) || 0;
    const r = parseFloat(interestRate) || 0;
    const m = parseInt(termMonths, 10) || 1;
    const procRate = parseFloat(processingFeeRate) || 0;
    const insRate = parseFloat(insuranceFeeRate) || 0;

    if (p <= 0 || m <= 0) {
      setResult(null);
      return;
    }

    const procFee = Math.round(((p * procRate) / 100) * 100) / 100;
    const insFee = Math.round(((p * insRate) / 100) * 100) / 100;
    const totalFees = Math.round((procFee + insFee) * 100) / 100;
    const netDisbursed = Math.round((p - totalFees) * 100) / 100;

    // Helper to calculate summary for any frequency
    const calcForFreq = (freq) => {
      let numInstallments = m;
      let daysInterval = 30;

      if (freq === 'DAILY') {
        numInstallments = m * 22; // 22 business days/month
        daysInterval = 1;
      } else if (freq === 'WEEKLY') {
        numInstallments = m * 4;
        daysInterval = 7;
      } else if (freq === 'FORTNIGHTLY') {
        numInstallments = m * 2;
        daysInterval = 14;
      } else {
        numInstallments = m;
        daysInterval = 30;
      }

      let totalInterest = 0;
      let installmentAmount = 0;
      const schedule = [];

      if (interestMethod === 'FLAT_RATE') {
        totalInterest = Math.round((p * (r / 100) * m) * 100) / 100;
        const totalRepayable = p + totalInterest;
        installmentAmount = Math.round((totalRepayable / numInstallments) * 100) / 100;

        const basePrincipal = Math.round((p / numInstallments) * 100) / 100;
        const baseInterest = Math.round((totalInterest / numInstallments) * 100) / 100;
        let runningPrincipal = p;

        let curDate = new Date(startDate);
        for (let i = 1; i <= numInstallments; i++) {
          const isLast = i === numInstallments;
          const instPrincipal = isLast ? runningPrincipal : basePrincipal;
          const instInterest = baseInterest;
          const instTotal = instPrincipal + instInterest;
          runningPrincipal = Math.max(0, runningPrincipal - instPrincipal);

          // First repayment installment due date starts exactly 1 week (7 days) after disbursement
          const firstDueDate = new Date(curDate);
          firstDueDate.setDate(firstDueDate.getDate() + 7);

          const d = new Date(firstDueDate);
          if (i > 1) {
            const offset = i - 1;
            if (freq === 'MONTHLY') {
              d.setMonth(d.getMonth() + offset);
            } else if (freq === 'WEEKLY') {
              d.setDate(d.getDate() + (offset * 7));
            } else if (freq === 'FORTNIGHTLY') {
              d.setDate(d.getDate() + (offset * 14));
            } else if (freq === 'DAILY') {
              d.setDate(d.getDate() + (offset * 1));
            } else {
              d.setDate(d.getDate() + (offset * daysInterval));
            }
          }

          schedule.push({
            installmentNumber: i,
            dueDate: d.toISOString().split('T')[0],
            principalDue: instPrincipal,
            interestDue: instInterest,
            totalDue: instTotal,
            remainingPrincipal: runningPrincipal,
          });
        }
      } else {
        // Reducing balance
        let periodicRate = (r / 100);
        if (freq === 'WEEKLY') periodicRate = periodicRate / 4;
        else if (freq === 'FORTNIGHTLY') periodicRate = periodicRate / 2;
        else if (freq === 'DAILY') periodicRate = periodicRate / 22;

        const factor = Math.pow(1 + periodicRate, numInstallments);
        const pmt = (p * (periodicRate * factor)) / (factor - 1);
        installmentAmount = Math.round(pmt * 100) / 100;

        let remPrincipal = p;
        let cumInterest = 0;
        let curDate = new Date(startDate);

        for (let i = 1; i <= numInstallments; i++) {
          const isLast = i === numInstallments;
          const instInterest = Math.round((remPrincipal * periodicRate) * 100) / 100;
          let instPrincipal = isLast ? remPrincipal : Math.round((pmt - instInterest) * 100) / 100;
          if (instPrincipal > remPrincipal) instPrincipal = remPrincipal;

          remPrincipal = Math.max(0, remPrincipal - instPrincipal);
          cumInterest += instInterest;

          // First repayment installment due date starts exactly 1 week (7 days) after disbursement
          const firstDueDate = new Date(curDate);
          firstDueDate.setDate(firstDueDate.getDate() + 7);

          const d = new Date(firstDueDate);
          if (i > 1) {
            const offset = i - 1;
            if (freq === 'MONTHLY') {
              d.setMonth(d.getMonth() + offset);
            } else if (freq === 'WEEKLY') {
              d.setDate(d.getDate() + (offset * 7));
            } else if (freq === 'FORTNIGHTLY') {
              d.setDate(d.getDate() + (offset * 14));
            } else if (freq === 'DAILY') {
              d.setDate(d.getDate() + (offset * 1));
            } else {
              d.setDate(d.getDate() + (offset * daysInterval));
            }
          }

          schedule.push({
            installmentNumber: i,
            dueDate: d.toISOString().split('T')[0],
            principalDue: instPrincipal,
            interestDue: instInterest,
            totalDue: instPrincipal + instInterest,
            remainingPrincipal: remPrincipal,
          });
        }
        totalInterest = Math.round(cumInterest * 100) / 100;
      }

      const totalRepayable = Math.round((p + totalInterest) * 100) / 100;

      return {
        frequency: freq,
        numInstallments,
        installmentAmount,
        totalInterest,
        totalRepayable,
        schedule,
      };
    };

    const daily = calcForFreq('DAILY');
    const weekly = calcForFreq('WEEKLY');
    const fortnightly = calcForFreq('FORTNIGHTLY');
    const monthly = calcForFreq('MONTHLY');

    setAllFrequencies({
      DAILY: daily,
      WEEKLY: weekly,
      FORTNIGHTLY: fortnightly,
      MONTHLY: monthly,
    });

    const activeCalc = freqMap(repaymentFrequency, { daily, weekly, fortnightly, monthly });

    setResult({
      principal: p,
      interestRate: r,
      termMonths: m,
      interestMethod,
      repaymentFrequency,
      processingFee: procFee,
      insuranceFee: insFee,
      totalFees,
      netDisbursed,
      totalInterest: activeCalc.totalInterest,
      totalRepayable: activeCalc.totalRepayable,
      installmentAmount: activeCalc.installmentAmount,
      numInstallments: activeCalc.numInstallments,
      schedule: activeCalc.schedule,
    });
  }, [principal, interestRate, termMonths, interestMethod, repaymentFrequency, processingFeeRate, insuranceFeeRate, startDate]);

  const freqMap = (f, map) => {
    if (f === 'DAILY') return map.daily;
    if (f === 'WEEKLY') return map.weekly;
    if (f === 'FORTNIGHTLY') return map.fortnightly;
    return map.monthly;
  };

  const handleQuickAdd = (amt) => {
    setPrincipal((prev) => Math.max(100, (parseFloat(prev) || 0) + amt));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-brand-600" />
            EL-FAITH Precision Loan Calculator
          </h2>
          <p className="text-xs text-slate-500">
            Authoritative interest calculation engine supporting Daily, Weekly, Fortnightly, and Monthly repayment schedules.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Printer className="w-4 h-4 text-gold-400" />
          Print / Export Quotation
        </button>
      </div>

      {/* Comparison Frequency Cards (Daily vs Weekly vs Fortnightly vs Monthly) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily Payment Card */}
        <div
          onClick={() => setRepaymentFrequency('DAILY')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            repaymentFrequency === 'DAILY'
              ? 'bg-gradient-to-br from-brand-900 to-navy-950 text-white border-brand-500 shadow-md ring-2 ring-brand-500'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-brand-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${repaymentFrequency === 'DAILY' ? 'text-gold-300' : 'text-slate-500'}`}>
              Daily Susu / Payment
            </span>
            <Clock className={`w-4 h-4 ${repaymentFrequency === 'DAILY' ? 'text-gold-400' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black">
              GH₵ {allFrequencies.DAILY ? allFrequencies.DAILY.installmentAmount.toFixed(2) : '0.00'}
            </span>
            <span className={`block text-[11px] font-medium mt-0.5 ${repaymentFrequency === 'DAILY' ? 'text-slate-300' : 'text-slate-500'}`}>
              per day ({allFrequencies.DAILY?.numInstallments || 0} business days)
            </span>
          </div>
        </div>

        {/* Weekly Payment Card */}
        <div
          onClick={() => setRepaymentFrequency('WEEKLY')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            repaymentFrequency === 'WEEKLY'
              ? 'bg-gradient-to-br from-brand-900 to-navy-950 text-white border-brand-500 shadow-md ring-2 ring-brand-500'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-brand-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${repaymentFrequency === 'WEEKLY' ? 'text-gold-300' : 'text-slate-500'}`}>
              Weekly Payment
            </span>
            <Calendar className={`w-4 h-4 ${repaymentFrequency === 'WEEKLY' ? 'text-gold-400' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black">
              GH₵ {allFrequencies.WEEKLY ? allFrequencies.WEEKLY.installmentAmount.toFixed(2) : '0.00'}
            </span>
            <span className={`block text-[11px] font-medium mt-0.5 ${repaymentFrequency === 'WEEKLY' ? 'text-slate-300' : 'text-slate-500'}`}>
              per week ({allFrequencies.WEEKLY?.numInstallments || 0} weeks)
            </span>
          </div>
        </div>

        {/* Fortnightly Payment Card */}
        <div
          onClick={() => setRepaymentFrequency('FORTNIGHTLY')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            repaymentFrequency === 'FORTNIGHTLY'
              ? 'bg-gradient-to-br from-brand-900 to-navy-950 text-white border-brand-500 shadow-md ring-2 ring-brand-500'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-brand-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${repaymentFrequency === 'FORTNIGHTLY' ? 'text-gold-300' : 'text-slate-500'}`}>
              Fortnightly (Every 2 Wks)
            </span>
            <Calendar className={`w-4 h-4 ${repaymentFrequency === 'FORTNIGHTLY' ? 'text-gold-400' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black">
              GH₵ {allFrequencies.FORTNIGHTLY ? allFrequencies.FORTNIGHTLY.installmentAmount.toFixed(2) : '0.00'}
            </span>
            <span className={`block text-[11px] font-medium mt-0.5 ${repaymentFrequency === 'FORTNIGHTLY' ? 'text-slate-300' : 'text-slate-500'}`}>
              every 2 weeks ({allFrequencies.FORTNIGHTLY?.numInstallments || 0} payments)
            </span>
          </div>
        </div>

        {/* Monthly Payment Card */}
        <div
          onClick={() => setRepaymentFrequency('MONTHLY')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            repaymentFrequency === 'MONTHLY'
              ? 'bg-gradient-to-br from-brand-900 to-navy-950 text-white border-brand-500 shadow-md ring-2 ring-brand-500'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-brand-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${repaymentFrequency === 'MONTHLY' ? 'text-gold-300' : 'text-slate-500'}`}>
              Monthly Payment
            </span>
            <Calendar className={`w-4 h-4 ${repaymentFrequency === 'MONTHLY' ? 'text-gold-400' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black">
              GH₵ {allFrequencies.MONTHLY ? allFrequencies.MONTHLY.installmentAmount.toFixed(2) : '0.00'}
            </span>
            <span className={`block text-[11px] font-medium mt-0.5 ${repaymentFrequency === 'MONTHLY' ? 'text-slate-300' : 'text-slate-500'}`}>
              per month ({allFrequencies.MONTHLY?.numInstallments || 0} installments)
            </span>
          </div>
        </div>
      </div>

      {/* Inputs & Financial Result Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Column */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-brand-600" />
            Loan Parameters
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Loan Principal Amount (GH₵)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">GH₵</span>
              <input
                type="number"
                step="50"
                min="100"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-extrabold text-navy-950 focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
            {/* Quick Increment Buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleQuickAdd(500)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px]"
              >
                +500
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(1000)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px]"
              >
                +1,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(5000)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px]"
              >
                +5,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(10000)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px]"
              >
                +10,000
              </button>
              <button
                type="button"
                onClick={() => setPrincipal(1000)}
                className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg text-[10px]"
              >
                Reset (1,000)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Interest Rate (% per month)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-brand-700 focus:bg-white focus:outline-none"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                ✓ EL-FAITH Fixed 10% Policy Active
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Loan Duration (Months)
              </label>
              <input
                type="number"
                min="1"
                max="36"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-navy-950 focus:bg-white focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Equals {parseInt(termMonths, 10) * 4} Weeks or {parseInt(termMonths, 10) * 22} Days
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Interest Method</label>
              <select
                value={interestMethod}
                onChange={(e) => setInterestMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="FLAT_RATE">FLAT RATE (Standard Ghana)</option>
                <option value="REDUCING_BALANCE">REDUCING BALANCE (Amortized)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Repayment Frequency</label>
              <select
                value={repaymentFrequency}
                onChange={(e) => setRepaymentFrequency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-brand-700 focus:bg-white focus:outline-none"
              >
                <option value="DAILY">DAILY (Susu / Daily Traders)</option>
                <option value="WEEKLY">WEEKLY (Market / Weekly Traders)</option>
                <option value="FORTNIGHTLY">FORTNIGHTLY (Bi-Weekly)</option>
                <option value="MONTHLY">MONTHLY (Salaried / Business)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Processing Fee %</label>
              <input
                type="number"
                step="0.1"
                value={processingFeeRate}
                onChange={(e) => setProcessingFeeRate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Insurance Fee %</label>
              <input
                type="number"
                step="0.1"
                value={insuranceFeeRate}
                onChange={(e) => setInsuranceFeeRate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Calculation Result Summary Column */}
        <div className="lg:col-span-6 bg-gradient-to-br from-navy-950 to-brand-950 p-6 rounded-2xl border border-navy-800 text-white shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
                Official Calculation Breakdown
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                {repaymentFrequency} REPAYMENT
              </span>
            </div>

            {result && (
              <div className="mt-5 space-y-3.5 text-xs">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">
                      {repaymentFrequency === 'DAILY' ? 'Daily Due:' : repaymentFrequency === 'WEEKLY' ? 'Weekly Due:' : repaymentFrequency === 'FORTNIGHTLY' ? 'Bi-Weekly Due:' : 'Monthly Due:'}
                    </span>
                    <span className="text-3xl font-black text-gold-400 block mt-0.5">
                      GH₵ {result.installmentAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-semibold">Total Installments</span>
                    <span className="text-lg font-extrabold text-white">{result.numInstallments} Payments</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex justify-between text-slate-300">
                    <span>Approved Gross Principal:</span>
                    <span className="font-bold text-white">GH₵ {result.principal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Total Interest ({result.interestRate}% on {result.termMonths} Months):</span>
                    <span className="font-bold text-gold-400">GH₵ {result.totalInterest.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>Less: Statutory Fees (Processing {processingFeeRate}% + Ins. {insuranceFeeRate}%):</span>
                    <span className="font-bold">- GH₵ {result.totalFees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-400 text-sm pt-1 border-t border-white/5">
                    <span>Net Cash Disbursed to Client:</span>
                    <span>GH₵ {result.netDisbursed.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-white text-base pt-2 border-t border-white/10">
                    <span>Total Contractual Repayable:</span>
                    <span className="text-gold-400">GH₵ {result.totalRepayable.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-black/20 rounded-xl text-[11px] text-slate-400 space-y-1 border border-white/5">
            <span className="font-bold text-slate-200 block">EL-FAITH MICROFINANCE Lending Notes:</span>
            <span>• Daily Susu accounts are based on a 22-business-day cycle per calendar month.</span>
            <span>• Weekly credit accounts are amortized into 4 equal weekly disbursements per month.</span>
          </div>
        </div>
      </div>

      {/* Full Generated Amortization Schedule */}
      {result && result.schedule.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-600" />
                Detailed Repayment Amortization Schedule ({result.schedule.length} Installments)
              </h3>
              <p className="text-[11px] text-slate-500">
                Frequency: <strong className="text-navy-950">{repaymentFrequency}</strong> | Method: <strong className="text-navy-950">{interestMethod}</strong>
              </p>
            </div>
            <span className="text-xs font-extrabold text-navy-950 bg-brand-50 px-3 py-1 rounded-lg border border-brand-200">
              Total: GH₵ {result.totalRepayable.toFixed(2)}
            </span>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4 text-right">Principal (GH₵)</th>
                  <th className="py-2.5 px-4 text-right">Interest (GH₵)</th>
                  <th className="py-2.5 px-4 text-right">Installment Due (GH₵)</th>
                  <th className="py-2.5 px-4 text-right">Remaining Principal (GH₵)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.schedule.map((row) => (
                  <tr key={row.installmentNumber} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-4 font-bold text-slate-400">{row.installmentNumber}</td>
                    <td className="py-2 px-4 font-semibold text-slate-800">{row.dueDate}</td>
                    <td className="py-2 px-4 text-right font-medium text-slate-700">
                      {row.principalDue.toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-right font-medium text-gold-600">
                      {row.interestDue.toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-right font-extrabold text-navy-950">
                      {row.totalDue.toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-right font-bold text-slate-500">
                      {row.remainingPrincipal.toFixed(2)}
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
