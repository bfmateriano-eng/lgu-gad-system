import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, FileText, Clock, CheckCircle, 
  AlertCircle, ChevronRight, ArrowLeft, Printer,
  Target, Calculator, Edit3, List, MessageSquare, Landmark,
  Bell, Quote
} from 'lucide-react';

export default function Dashboard({ session, onAddNew, onEdit }) {
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState({ indicators: [], budget: [] });

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
        
        setDetails({ indicators: indicators || [], budget: budget || [] });
      };
      fetchDetails();
    }
  }, [selectedProposal]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
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
            {(selectedProposal.status === 'Draft' || selectedProposal.status === 'Returned') && (
              <button 
                onClick={() => onEdit(selectedProposal)}
                className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg"
              >
                <Edit3 size={16} /> Edit & Resubmit
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

        {/* MAYOR'S FEEDBACK PANEL */}
        {selectedProposal.reviewer_comments && (
          <div className={`rounded-[2.5rem] p-10 border-2 relative overflow-hidden animate-in slide-in-from-top-4 duration-500 ${selectedProposal.status === 'Approved' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-200 shadow-xl shadow-amber-900/5'}`}>
            <Quote className="absolute top-4 right-8 text-amber-200/40" size={80} />
            <div className={`flex items-center gap-2 font-black text-[10px] uppercase mb-4 tracking-[0.2em] ${selectedProposal.status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'}`}>
              <MessageSquare size={18} /> Executive Remarks from the Mayor
            </div>
            <p className={`text-lg font-bold leading-relaxed italic relative z-10 ${selectedProposal.status === 'Approved' ? 'text-emerald-900' : 'text-amber-900'}`}>
              "{selectedProposal.reviewer_comments}"
            </p>
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-sm space-y-10">
          <div className="flex justify-between items-start border-b pb-8">
            <div className="space-y-2">
              <span className={`px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusStyle(selectedProposal.status)}`}>
                {selectedProposal.status}
              </span>
              <h2 className="text-4xl font-black text-indigo-950 tracking-tighter leading-tight mt-4 uppercase">
                {selectedProposal.gad_activity}
              </h2>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest flex items-center gap-2 mt-2">
                <Landmark size={14} className="text-indigo-500" /> {selectedProposal.relevant_program}
              </p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Record ID</p>
                <p className="font-mono text-xs text-indigo-900">#{selectedProposal.id.slice(0,8)}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-4">
                <h4 className="font-black text-indigo-900 uppercase text-xs flex items-center gap-2 tracking-widest">
                  <Target size={18} className="text-indigo-400" /> Logical Framework
                </h4>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Gender Issue Evidence</p>
                    <p className="text-sm font-medium leading-relaxed text-slate-700 italic">"{selectedProposal.gender_issue}"</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-indigo-900 uppercase text-xs flex items-center gap-2 tracking-widest">
                  <List size={18} className="text-indigo-400" /> Success Indicators
                </h4>
                <div className="space-y-3">
                  {details.indicators.map((ind, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border flex justify-between items-center gap-4 shadow-sm group hover:border-indigo-300 transition-all">
                      <p className="text-sm font-medium text-slate-600">{ind.indicator_text}</p>
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                        Target: {ind.target_text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-black text-indigo-900 uppercase text-xs flex items-center gap-2 tracking-widest">
                <Calculator size={18} className="text-indigo-400" /> Financial Itemization
              </h4>
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.budget.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="px-6 py-4 font-medium text-slate-600">
                          {item.item_description}
                          <span className="block text-[9px] text-indigo-400 font-black uppercase tracking-tighter mt-0.5">{item.fund_type}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold">₱{item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-indigo-950 p-6 text-white flex justify-between items-center">
                  <p className="text-xs font-black uppercase tracking-widest">Consolidated Budget</p>
                  <p className="text-2xl font-mono font-black">₱{(selectedProposal.total_mooe + selectedProposal.total_ps + selectedProposal.total_co).toLocaleString()}</p>
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
      <p className="font-black text-indigo-900 uppercase tracking-widest text-xs">Accessing Official GAD Records...</p>
    </div>
  );

  return (
    <div className="p-8 md:p-12 space-y-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-indigo-950 uppercase tracking-tighter">My GAD Records</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Implementation Dashboard • FY 2026</p>
        </div>
        <button 
          onClick={onAddNew}
          className="bg-[#1e1b4b] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-900 transition-all shadow-2xl shadow-indigo-100 transform active:scale-95"
        >
          <Plus size={20} /> Create New Plan
        </button>
      </div>

      {/* FEEDBACK NOTIFICATION BANNER */}
      {proposals.some(p => p.reviewer_comments && p.status === 'Returned') && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-xl shadow-amber-900/5 animate-in slide-in-from-top duration-500">
          <div className="bg-amber-500 text-white p-3 rounded-2xl shadow-lg animate-bounce">
            <Bell size={24} />
          </div>
          <div className="flex-grow">
            <h4 className="text-amber-900 font-black uppercase text-[10px] tracking-widest mb-1">Mayor's Office Notice</h4>
            <p className="text-amber-800/80 text-sm font-bold">One or more proposals require your immediate attention based on executive remarks.</p>
          </div>
        </div>
      )}

      {/* PROPOSALS GRID */}
      {proposals.length === 0 ? (
        <div className="bg-slate-50 border-4 border-dotted border-slate-200 rounded-[3rem] p-24 text-center">
          <FileText className="mx-auto text-slate-200 mb-6" size={64} />
          <p className="text-slate-400 font-black uppercase tracking-[0.2em]">No GAD Records on File</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {proposals.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedProposal(item)}
              className="group bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] cursor-pointer hover:border-indigo-400 transition-all hover:shadow-2xl flex items-center justify-between relative overflow-hidden"
            >
              <div className="flex items-center gap-6 relative z-10">
                <div className={`p-5 rounded-2xl transition-all ${item.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                  {item.status === 'Approved' ? <CheckCircle size={28} /> : item.reviewer_comments ? <MessageSquare size={28} /> : <FileText size={28} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-black text-indigo-950 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.gad_activity}</h4>
                    {item.reviewer_comments && (
                      <span className="flex items-center gap-1 bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter">
                        Feedback
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-tighter ${getStatusStyle(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-10 relative z-10">
                 <div className="text-right hidden md:block border-r border-slate-100 pr-10">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Allocation</p>
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