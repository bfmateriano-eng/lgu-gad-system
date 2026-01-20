import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, FileText, Clock, CheckCircle, 
  AlertCircle, ChevronRight, ArrowLeft, Printer,
  Target, Calculator, Edit3, List, MessageSquare, Landmark,
  Bell, Quote, History
} from 'lucide-react';

export default function Dashboard({ session, onAddNew, onEdit }) {
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState({ indicators: [], budget: [] });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchMyProposals();
  }, [session]);

  async function fetchMyProposals() {
    setLoading(true);
    const { data, error } = await supabase
      .from('gad_proposals')
      .select('*') // This correctly pulls sectional_comments for Optimization 1b
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Sync Error:", error.message);
    } else {
      setProposals(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (selectedProposal) {
      const fetchDetails = async () => {
        const { data: indicators } = await supabase
          .from('ppa_indicators')
          .select('*')
          .eq('ppa_id', selectedProposal.id);
        
        const { data: budget } = await supabase
          .from('ppa_budget_items')
          .select('*')
          .eq('ppa_id', selectedProposal.id);

        // Optimization 3: Fetch the PPA Tracer History
        const { data: hist } = await supabase
          .from('ppa_history')
          .select('*')
          .eq('ppa_id', selectedProposal.id)
          .order('created_at', { ascending: false });
        
        setDetails({ indicators: indicators || [], budget: budget || [] });
        setHistory(hist || []);
      };
      fetchDetails();
    }
  }, [selectedProposal]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'For Revision': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Returned': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Submitted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Draft': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    }
  };

  // --- DETAIL VIEW RENDER ---
  if (selectedProposal) {
    return (
      <div className="p-8 md:p-12 space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedProposal(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all"
          >
            <ArrowLeft size={16} /> Close Details
          </button>
          
          <div className="flex gap-3">
            {(selectedProposal.status === 'Draft' || selectedProposal.status === 'For Revision' || selectedProposal.status === 'Returned') && (
              <button 
                onClick={() => onEdit(selectedProposal)}
                className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg"
              >
                <Edit3 size={16} /> Open for Revision
              </button>
            )}
            <button 
              onClick={() => window.print()}
              className="bg-slate-100 text-slate-600 px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-200 transition-all"
            >
              <Printer size={16} /> Print for File
            </button>
          </div>
        </div>

        {/* SECTIONAL FEEDBACK ALERT PANEL (Optimization 1b) */}
        {selectedProposal.status === 'For Revision' && selectedProposal.sectional_comments && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-[2.5rem] p-8 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-amber-700 font-black text-[10px] uppercase tracking-[0.2em]">
              <AlertCircle size={18} /> GAD Unit Sectional Requirements
            </div>
            <div className="grid md:grid-cols-2 gap-4">
               {Object.entries(selectedProposal.sectional_comments).map(([section, text]) => text && (
                 <div key={section} className="bg-white/50 border border-amber-100 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-amber-600 uppercase mb-1">{section.replace('_', ' ')}</p>
                    <p className="text-sm font-bold text-amber-900 leading-tight">"{text}"</p>
                 </div>
               ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-sm space-y-10">
              <div className="flex justify-between items-start border-b pb-8">
                <div className="space-y-2">
                  <span className={`px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusStyle(selectedProposal.status)}`}>
                    {selectedProposal.status}
                  </span>
                  <h2 className="text-4xl font-black text-indigo-950 tracking-tighter leading-tight mt-4 uppercase">
                    {selectedProposal.gad_activity}
                  </h2>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consolidated Budget</p>
                    <p className="font-mono text-2xl font-black text-indigo-900">₱{(selectedProposal.total_mooe + selectedProposal.total_ps + selectedProposal.total_co).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="font-black text-indigo-900 uppercase text-xs flex items-center gap-2 tracking-widest">
                    <Target size={18} className="text-indigo-400" /> Logical Framework
                  </h4>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Gender Issue / Mandate</p>
                      <p className="text-sm font-medium leading-relaxed text-slate-700 italic">"{selectedProposal.gender_issue}"</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-indigo-900 uppercase text-xs flex items-center gap-2 tracking-widest">
                    <List size={18} className="text-indigo-400" /> Indicators & Targets
                  </h4>
                  <div className="space-y-3">
                    {details.indicators.map((ind, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl border flex justify-between items-center gap-4">
                        <p className="text-sm font-medium text-slate-600">{ind.indicator_text}</p>
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                          Target: {ind.target_text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
             {/* PPA TRACER LOG (Optimization 3) */}
             <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <History className="text-indigo-600" size={20} />
                  <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-900">PPA Lifecycle Tracer</h3>
                </div>
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                    {history.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">No history recorded.</p>
                    ) : history.map((h, i) => (
                        <div key={i} className="relative pl-6 border-l-2 border-indigo-100 py-1">
                            <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white"></div>
                            <p className="text-[10px] font-black text-indigo-900 uppercase tracking-tighter">{h.action_type}</p>
                            <p className="text-[9px] text-slate-400 font-bold mb-1">{new Date(h.created_at).toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500 leading-tight">{h.change_summary}</p>
                        </div>
                    ))}
                </div>
              </div>
          </div>
        </div>
      </div>
    );
  }

  // --- LIST VIEW RENDER ---
  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4 animate-pulse">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="font-black text-indigo-900 uppercase tracking-widest text-xs">Syncing Registry...</p>
    </div>
  );

  return (
    <div className="p-8 md:p-12 space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-indigo-950 uppercase tracking-tighter">My GAD Records</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Status: Operational • PILILLA GAD SYSTEM</p>
        </div>
        <button 
          onClick={onAddNew}
          className="bg-[#1e1b4b] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-900 transition-all shadow-2xl active:scale-95"
        >
          <Plus size={20} /> Create New Plan
        </button>
      </div>

      {/* FEEDBACK BANNER (Optimization 1b) */}
      {proposals.some(p => p.status === 'For Revision') && (
        <div className="bg-amber-600 text-white p-6 rounded-[2.5rem] flex items-center gap-5 shadow-xl animate-in slide-in-from-top duration-500">
          <div className="bg-white/20 p-3 rounded-2xl animate-bounce">
            <Bell size={24} />
          </div>
          <div className="flex-grow">
            <h4 className="font-black uppercase text-[10px] tracking-widest mb-1">Action Required</h4>
            <p className="text-sm font-bold">The GAD Unit has returned plans for revision. Click on records to view specific instructions.</p>
          </div>
        </div>
      )}

      {/* PROPOSALS LIST */}
      {proposals.length === 0 ? (
        <div className="bg-slate-50 border-4 border-dotted border-slate-200 rounded-[3rem] p-24 text-center">
          <FileText className="mx-auto text-slate-200 mb-6" size={64} />
          <p className="text-slate-400 font-black uppercase tracking-[0.2em]">No GAD Records Found</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {proposals.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedProposal(item)}
              className="group bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] cursor-pointer hover:border-indigo-400 transition-all hover:shadow-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className={`p-5 rounded-2xl transition-all ${item.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                  {item.status === 'Approved' ? <CheckCircle size={28} /> : item.status === 'For Revision' ? <AlertCircle size={28} /> : <FileText size={28} />}
                </div>
                <div>
                  <h4 className="text-xl font-black text-indigo-950 uppercase leading-tight group-hover:text-indigo-600 transition-colors">{item.gad_activity}</h4>
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase ${getStatusStyle(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-10">
                 <div className="text-right hidden md:block border-r border-slate-100 pr-10">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Budget</p>
                    <p className="font-mono font-bold text-lg text-indigo-900">₱{(item.total_mooe + item.total_ps + item.total_co).toLocaleString()}</p>
                 </div>
                 <ChevronRight className="text-slate-200 group-hover:text-indigo-500 transform group-hover:translate-x-2 transition-all" size={32} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}