import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Award, TrendingUp, Landmark, 
  FileText, Eye, X, BarChart3, 
  Target, Wallet, Search, CheckCircle, Database, MessageSquare, Send
} from 'lucide-react';

export default function LCEView({ onNavigate }) {
  const [summary, setSummary] = useState({
    totalBudget: 0, officeCount: 0, submissionRate: 0, approvedBudget: 0, topOffices: []
  });
  const [submittedPPAs, setSubmittedPPAs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPPA, setSelectedPPA] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSavingRemarks, setIsSavingRemarks] = useState(false);

  useEffect(() => {
    fetchLCEData();
  }, []);

  const fetchLCEData = async () => {
    setLoading(true);
    try {
      const { data: proposals } = await supabase
        .from('gad_proposals')
        .select(`*, ppa_indicators (*), ppa_budget_items (*)`)
        .neq('status', 'Draft')
        .order('office_name', { ascending: true });

      const { data: offices } = await supabase.from('profiles').select('office_name');

      if (proposals) {
        const total = proposals.reduce((sum, p) => sum + (p.total_mooe + p.total_ps + p.total_co), 0);
        const approved = proposals.filter(p => p.status === 'Approved')
                                  .reduce((sum, p) => sum + (p.total_mooe + p.total_ps + p.total_co), 0);
        
        const distinctOffices = new Set(proposals.map(p => p.office_name)).size;
        setSummary({
          totalBudget: total,
          approvedBudget: approved,
          officeCount: offices?.length || 1,
          submissionRate: ((distinctOffices / (offices?.length || 1)) * 100).toFixed(0),
          topOffices: Object.entries(proposals.reduce((acc, p) => {
            acc[p.office_name] = (acc[p.office_name] || 0) + (p.total_mooe + p.total_ps + p.total_co);
            return acc;
          }, {})).sort(([, a], [, b]) => b - a).slice(0, 5)
        });
        setSubmittedPPAs(proposals);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSaveRemarks = async () => {
    setIsSavingRemarks(true);
    try {
      const { error } = await supabase
        .from('gad_proposals')
        .update({ reviewer_comments: remarks })
        .eq('id', selectedPPA.id);
      
      if (error) throw error;
      alert("Remarks successfully attached to PPA.");
      fetchLCEData();
    } catch (err) { alert(err.message); }
    finally { setIsSavingRemarks(false); }
  };

  const parseGenderIssue = (str) => {
    if (!str) return { issue: 'N/A', data: 'N/A', source: 'N/A' };
    const parts = str.split('\n');
    return {
      issue: parts[0]?.replace('Issue: ', '') || 'N/A',
      data: parts[1]?.replace('Data: ', '') || 'No data provided',
      source: parts[2]?.replace('Source: ', '') || 'Not specified'
    };
  };

  const filteredPPAs = submittedPPAs.filter(ppa => 
    ppa.office_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ppa.gad_activity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-5xl font-black text-indigo-950 tracking-tighter uppercase leading-none">Mayor's Overview</h1>
          <p className="text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-widest border-l-4 border-indigo-500 pl-3">Executive Oversight & Remarks</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search departments..." className="pl-12 pr-6 py-3 bg-white border rounded-2xl text-sm font-semibold shadow-sm w-64 outline-none focus:border-indigo-500" onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* QUICK NAVIGATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div onClick={() => onNavigate('approved_list')} className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-[2.5rem] shadow-xl cursor-pointer hover:scale-[1.01] transition-all text-white relative overflow-hidden">
          <CheckCircle className="absolute -right-4 -top-4 w-24 h-24 opacity-20" />
          <h3 className="text-2xl font-black tracking-tighter uppercase leading-tight">Approved Registry</h3>
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mt-1">Detailed 9-Column Consolidated GPB</p>
        </div>
        <div onClick={() => onNavigate('analytics')} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 cursor-pointer hover:scale-[1.01] transition-all relative overflow-hidden">
          <BarChart3 className="absolute -right-4 -top-4 w-24 h-24 opacity-5 text-indigo-600" />
          <h3 className="text-2xl font-black tracking-tighter uppercase text-indigo-950">Analytics Center</h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Budget Allocation & Compliance</p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b">
                <tr><th className="p-5">Department</th><th className="p-5">Activity</th><th className="p-5 text-right">Budget</th><th className="p-5 text-center">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPPAs.map((ppa) => (
                  <tr key={ppa.id} className="hover:bg-indigo-50/50 cursor-pointer transition-all" onClick={() => { setSelectedPPA(ppa); setRemarks(ppa.reviewer_comments || ''); }}>
                    <td className="p-5 font-black text-indigo-900 text-[10px] uppercase">{ppa.office_name}</td>
                    <td className="p-5 text-slate-600 font-bold text-xs">{ppa.gad_activity}</td>
                    <td className="p-5 text-right font-mono font-black text-indigo-600 text-xs">₱{(ppa.total_mooe + ppa.total_ps + ppa.total_co).toLocaleString()}</td>
                    <td className="p-5 text-center"><span className={`px-2 py-1 rounded-md font-black text-[8px] uppercase ${ppa.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{ppa.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-[#1e1b4b] p-8 rounded-[3rem] text-white shadow-2xl h-fit">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Budget Leaders</h3>
          {summary.topOffices.map(([name, amount], i) => (
            <div key={i} className="flex flex-col py-3 border-b border-white/10">
              <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">{name}</span>
              <span className="font-mono text-sm font-black">₱{amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* --- DETAILED MODAL WITH REMARKS --- */}
      {selectedPPA && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b bg-slate-50 flex justify-between items-start">
              <div className="space-y-2">
                <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedPPA.office_name}</span>
                <h2 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter leading-tight">{selectedPPA.gad_activity}</h2>
              </div>
              <button onClick={() => setSelectedPPA(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={28} className="text-slate-400" /></button>
            </div>

            <div className="p-10 space-y-10 overflow-y-auto">
               <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2"><FileText size={14}/> Gender Issue</label>
                      <p className="text-slate-700 font-bold bg-indigo-50/50 p-6 rounded-[2rem] border italic leading-relaxed">"{parseGenderIssue(selectedPPA.gender_issue).issue}"</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                        <label className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-2 mb-1"><BarChart3 size={12}/> Data</label>
                        <p className="text-[11px] font-bold text-slate-600">{parseGenderIssue(selectedPPA.gender_issue).data}</p>
                      </div>
                      <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                        <label className="text-[9px] font-black text-amber-600 uppercase flex items-center gap-2 mb-1"><Database size={12}/> Source</label>
                        <p className="text-[11px] font-bold text-slate-600">{parseGenderIssue(selectedPPA.gender_issue).source}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Target size={14}/> Targets</label>
                    <div className="bg-slate-50 p-6 rounded-[2rem] border space-y-3">
                      {selectedPPA.ppa_indicators?.map((ind, i) => (
                        <p key={i} className="text-xs font-bold text-slate-700 leading-tight">
                          <span className="text-emerald-500">•</span> {ind.target_text} {ind.indicator_text}
                        </p>
                      ))}
                    </div>
                  </div>
               </div>

               {/* REMARKS SECTION */}
               <div className="pt-8 border-t border-slate-100">
                  <label className="text-[10px] font-black text-indigo-950 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                    <MessageSquare size={16} className="text-indigo-600" /> Executive Remarks / Instructions
                  </label>
                  <div className="relative">
                    <textarea 
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter instructions, policy guidance, or congratulatory notes here..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-6 text-sm font-medium focus:border-indigo-500 outline-none min-h-[120px] transition-all"
                    />
                    <button 
                      onClick={handleSaveRemarks}
                      disabled={isSavingRemarks}
                      className="absolute bottom-4 right-4 bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 disabled:bg-slate-300 transition-all shadow-lg"
                    >
                      <Send size={14} /> {isSavingRemarks ? 'Saving...' : 'Save Remarks'}
                    </button>
                  </div>
               </div>
            </div>

            <div className="p-8 bg-slate-50 border-t flex justify-center">
              <button onClick={() => setSelectedPPA(null)} className="px-12 bg-white border border-slate-200 text-slate-400 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Close Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, color }) {
  const styles = { indigo: "bg-white text-indigo-950 border-slate-200", emerald: "bg-emerald-600 text-white border-emerald-500 shadow-emerald-200", slate: "bg-white text-slate-900 border-slate-200" };
  return (
    <div className={`p-8 rounded-[2.5rem] shadow-xl border-2 ${styles[color]} relative overflow-hidden group`}>
      <TrendingUp className="absolute -right-4 -top-4 w-24 h-24 opacity-5 group-hover:scale-110 transition-transform" />
      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${color === 'emerald' ? 'text-emerald-100' : 'text-slate-400'}`}>{title}</p>
      <p className="text-3xl font-black tracking-tighter">₱{value.toLocaleString()}</p>
    </div>
  );
}