import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, FileText, Clock, CheckCircle, 
  AlertCircle, ChevronRight, ArrowLeft, Printer,
  Target, Calculator, Edit3, List, MessageSquare, Landmark,
  Bell, Quote, History, PieChart
} from 'lucide-react';

export default function Dashboard({ session, onAddNew, onEdit, officeName }) {
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
      .select('*') 
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
      <div className="p-4 md:p-12 space-y-6 animate-in fade-in duration-300 pb-24 print:p-0 print:m-0">
        
        {/* HEADER ACTIONS - Hidden on Print */}
        <div className="flex justify-between items-center print:hidden">
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
              className="bg-slate-100 text-slate-900 px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-slate-200 transition-all shadow-sm"
            >
              <Printer size={16} /> Print for File
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-6 print:space-y-4">
          {/* Official Document Header */}
          <div className="border-b-4 border-indigo-950 pb-4 flex justify-between items-end print:border-b-2">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] leading-none">GAD Plan & Budget Detail</p>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight print:text-xl">
                {selectedProposal.gad_activity}
              </h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Landmark size={12} /> {selectedProposal.office_name}
              </p>
            </div>
            <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase">Status</p>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusStyle(selectedProposal.status)}`}>
                    {selectedProposal.status}
                </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 print:block print:space-y-4">
            <div className="lg:col-span-2 space-y-6 print:space-y-4">
              
              {/* 1. Logical Framework Card */}
              <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm print:rounded-none print:border-slate-300 print:p-4">
                <h4 className="font-black text-indigo-900 uppercase text-[10px] flex items-center gap-2 tracking-[0.2em] mb-4">
                  <FileText size={14} className="text-indigo-400" /> I. Logical Framework
                </h4>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl print:bg-transparent print:p-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Gender Issue / GAD Mandate</p>
                    <p className="text-sm text-slate-700 italic leading-snug">"{selectedProposal.gender_issue}"</p>
                  </div>
                  <div className="bg-indigo-50/50 p-4 rounded-xl print:bg-transparent print:p-0">
                    <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">GAD Objective</p>
                    <p className="text-sm font-bold text-indigo-950 leading-snug">{selectedProposal.gad_objective}</p>
                  </div>
                </div>
              </div>

              {/* 2. Success Indicators Table */}
              <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm print:rounded-none print:border-slate-300 print:p-4">
                <h4 className="font-black text-indigo-900 uppercase text-[10px] flex items-center gap-2 tracking-[0.2em] mb-4">
                  <Target size={14} className="text-indigo-400" /> II. Performance Indicators
                </h4>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {details.indicators.map((ind, i) => (
                        <tr key={i}>
                          <td className="p-3 text-slate-600 font-medium">{ind.indicator_text}</td>
                          <td className="p-3 text-right font-black text-indigo-600 uppercase w-32 border-l bg-slate-50">Target: {ind.target_text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Detailed Budget Table */}
              <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm print:rounded-none print:border-slate-300 print:p-4">
                <h4 className="font-black text-indigo-900 uppercase text-[10px] flex items-center gap-2 tracking-[0.2em] mb-4">
                  <PieChart size={14} className="text-indigo-400" /> III. Budgetary Requirements
                </h4>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b">
                      <tr className="text-[8px] font-black text-slate-400 uppercase">
                        <th className="p-3">Expense Description</th>
                        <th className="p-3 text-center">Fund</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details.budget.map((item, i) => (
                        <tr key={i}>
                          <td className="p-3 font-semibold text-slate-700">{item.item_description}</td>
                          <td className="p-3 text-center font-bold text-slate-400">{item.fund_type}</td>
                          <td className="p-3 text-right font-mono font-bold">₱{item.amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-black">
                        <td colSpan="2" className="p-3 uppercase tracking-widest text-[9px]">Total GAD Allocation</td>
                        <td className="p-3 text-right text-lg font-mono">₱{selectedProposal.gad_budget?.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Signatures for Print */}
              <div className="hidden print:grid grid-cols-2 gap-12 pt-10 pb-4">
                <div className="border-t-2 border-slate-900 pt-2">
                  <p className="text-[9px] font-black uppercase mb-8 tracking-widest">Prepared By:</p>
                  <p className="text-sm font-black uppercase">{selectedProposal.office_name}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Head of Office / GAD Focal Point</p>
                </div>
                <div className="border-t-2 border-slate-900 pt-2">
                  <p className="text-[9px] font-black uppercase mb-8 tracking-widest">Approved for Mainstreaming:</p>
                  <p className="text-sm font-black uppercase italic">GAD UNIT CHAIRPERSON</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Local Government Unit of Pililla</p>
                </div>
              </div>
            </div>

            {/* SIDEBAR - PPA TRACER LOG (Updated with WHO info) */}
            <div className="lg:col-span-1 space-y-6 print:hidden">
               <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <History className="text-indigo-600" size={20} />
                    <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-900">PPA Lifecycle Tracer</h3>
                  </div>
                  <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                      {history.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">No history recorded.</p>
                      ) : (
                        history.map((h, i) => (
                          <div key={i} className="relative pl-6 border-l-2 border-indigo-100 py-1">
                              <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm"></div>
                              <div className="flex flex-col gap-1">
                                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-tighter">{h.action_type}</p>
                                <p className="text-[9px] text-slate-400 font-bold">{new Date(h.created_at).toLocaleString()}</p>
                                <p className="text-[10px] text-slate-500 leading-tight">{h.change_summary}</p>
                                
                                {/* Action By Badge */}
                                <div className="mt-2 flex items-center gap-1.5">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Action By:</span>
                                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[9px] font-black border border-indigo-100 uppercase">
                                    {h.action_by || 'System'}
                                  </span>
                                </div>
                              </div>
                          </div>
                        ))
                      )}
                  </div>
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
                    <p className="font-mono font-bold text-lg text-indigo-900">₱{item.gad_budget?.toLocaleString()}</p>
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