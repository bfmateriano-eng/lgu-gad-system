import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  BarChart3, PieChart, Users, Wallet, 
  CheckCircle2, Clock, AlertCircle, ArrowLeft 
} from 'lucide-react';

export default function GADAnalytics({ onBack }) {
  const [metrics, setMetrics] = useState({
    totalBudget: 0,
    mooe: 0, ps: 0, co: 0,
    submitted: 0,
    drafts: 0,
    approved: 0,
    clientFocused: 0,
    orgFocused: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('gad_proposals').select('*');

    if (data) {
      const stats = data.reduce((acc, ppa) => {
        // Budget Totals
        acc.totalBudget += (ppa.total_mooe + ppa.total_ps + ppa.total_co);
        acc.mooe += ppa.total_mooe;
        acc.ps += ppa.total_ps;
        acc.co += ppa.total_co;

        // Status Counts
        if (ppa.status === 'Submitted') acc.submitted++;
        if (ppa.status === 'Draft') acc.drafts++;
        if (ppa.status === 'Approved') acc.approved++;

        // Focus Counts
        if (ppa.focus_type === 'CLIENT-FOCUSED') acc.clientFocused++;
        if (ppa.focus_type === 'ORGANIZATION-FOCUSED') acc.orgFocused++;

        return acc;
      }, { totalBudget: 0, mooe: 0, ps: 0, co: 0, submitted: 0, drafts: 0, approved: 0, clientFocused: 0, orgFocused: 0 });

      setMetrics(stats);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse">Calculating Analytics...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="mb-10">
        <h1 className="text-4xl font-black text-indigo-950 tracking-tighter uppercase">GAD Analytics 2026</h1>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Real-time Monitoring & Evaluation</p>
      </div>

      {/* TOP ROW: STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard title="Total GAD Budget" value={`₱${metrics.totalBudget.toLocaleString()}`} icon={<Wallet className="text-indigo-600" />} color="bg-white" />
        <StatCard title="Approved Plans" value={metrics.approved} icon={<CheckCircle2 className="text-emerald-500" />} color="bg-emerald-50" />
        <StatCard title="Pending Review" value={metrics.submitted} icon={<Clock className="text-amber-500" />} color="bg-amber-50" />
        <StatCard title="Still in Draft" value={metrics.drafts} icon={<AlertCircle className="text-slate-400" />} color="bg-slate-100" />
      </div>

      {/* SECOND ROW: DETAILED ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* BUDGET BREAKDOWN CHART AREA */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl shadow-indigo-900/5">
          <h3 className="text-lg font-black text-indigo-950 uppercase tracking-tighter mb-8 flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-600" /> Fund Source Allocation
          </h3>
          <div className="space-y-6">
            <ProgressBar label="MOOE" value={metrics.mooe} total={metrics.totalBudget} color="bg-indigo-600" />
            <ProgressBar label="Personal Services (PS)" value={metrics.ps} total={metrics.totalBudget} color="bg-emerald-500" />
            <ProgressBar label="Capital Outlay (CO)" value={metrics.co} total={metrics.totalBudget} color="bg-amber-500" />
          </div>
        </div>

        {/* FOCUS AREA ANALYSIS */}
        <div className="bg-[#1e1b4b] p-8 rounded-[3rem] text-white shadow-2xl">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-8 flex items-center gap-2 text-indigo-300">
            <PieChart size={20} /> Focus Distribution
          </h3>
          <div className="grid grid-cols-2 gap-4 h-48">
             <div className="flex flex-col justify-center items-center bg-white/5 rounded-[2rem] border border-white/10 p-6">
                <span className="text-4xl font-black">{metrics.clientFocused}</span>
                <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mt-2">Client Focused</span>
             </div>
             <div className="flex flex-col justify-center items-center bg-white/5 rounded-[2rem] border border-white/10 p-6">
                <span className="text-4xl font-black">{metrics.orgFocused}</span>
                <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mt-2">Org Focused</span>
             </div>
          </div>
          <p className="mt-6 text-[10px] text-indigo-400 font-medium italic text-center">
            Proportion of PPAs addressing external community issues vs internal organizational mandates.
          </p>
        </div>

      </div>
    </div>
  );
}

// Sub-components for cleaner code
function StatCard({ title, value, icon, color }) {
  return (
    <div className={`${color} p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center justify-between`}>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-indigo-950 tracking-tighter">{value}</p>
      </div>
      <div className="p-3 bg-white rounded-2xl shadow-inner border border-slate-50">{icon}</div>
    </div>
  );
}

function ProgressBar({ label, value, total, color }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-xs font-black text-slate-700 uppercase">{label}</span>
        <span className="font-mono font-bold text-indigo-900 text-sm">₱{value.toLocaleString()} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}