import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Award, TrendingUp, Landmark, FileText, Eye, X, BarChart3, 
  Target, Wallet, Search, CheckCircle, Database, MessageSquare, 
  Send, History, Zap, Layers, Calculator, ArrowLeft, RefreshCw
} from 'lucide-react';

export default function LCEView({ onNavigate }) {
  const [summary, setSummary] = useState({
    totalBudget: 0, officeCount: 0, submissionRate: 0, approvedBudget: 0, topOffices: []
  });
  const [submittedPPAs, setSubmittedPPAs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPPA, setSelectedPPA] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // States shared with GAD Unit logic for sectional review
  const [details, setDetails] = useState({ indicators: [], budget: [] });
  const [history, setHistory] = useState([]);
  const [editedPpa, setEditedPpa] = useState({});
  const [sectionalComments, setSectionalComments] = useState({
    gender_issue: '', objectives: '', activities: '', indicators: '', budget: ''
  });

  useEffect(() => {
    fetchLCEData();
  }, []);

  // Fetch sub-details when a PPA is selected
  useEffect(() => {
    if (selectedPPA) {
      const fetchPPADetails = async () => {
        const { data: ind } = await supabase.from('ppa_indicators').select('*').eq('ppa_id', selectedPPA.id);
        const { data: bud } = await supabase.from('ppa_budget_items').select('*').eq('ppa_id', selectedPPA.id);
        const { data: hist } = await supabase.from('ppa_history').select('*').eq('ppa_id', selectedPPA.id).order('created_at', { ascending: false });
        
        setDetails({ indicators: ind || [], budget: bud || [] });
        setHistory(hist || []);
        
        // Initialize editing state (Optimization 1a: Mainstreaming)
        setEditedPpa({
          gad_activity: selectedPPA.gad_activity,
          gad_objective: selectedPPA.gad_objective,
          gender_issue: selectedPPA.gender_issue
        });

        // Initialize sectional remarks (Optimization 1b)
        setSectionalComments(selectedPPA.sectional_comments || {
          gender_issue: '', objectives: '', activities: '', indicators: '', budget: ''
        });
      };
      fetchPPADetails();
    }
  }, [selectedPPA]);

  const fetchLCEData = async () => {
    setLoading(true);
    try {
      const { data: proposals } = await supabase
        .from('gad_proposals')
        .select(`*`)
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

  const handleUpdateStatus = async (targetStatus) => {
    if (!selectedPPA) return;
    setIsProcessing(true);
    
    // Explicitly set the status string to match User/GAD Unit dashboards
    const finalStatus = targetStatus === 'Returned' ? 'For Revision' : 'Approved';

    try {
      const { error } = await supabase
        .from('gad_proposals')
        .update({ 
          status: finalStatus,
          gad_activity: editedPpa.gad_activity,
          gad_objective: editedPpa.gad_objective,
          gender_issue: editedPpa.gender_issue,
          sectional_comments: sectionalComments,
          reviewer_comments: `Executive Action: ${finalStatus}`, 
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPPA.id);
      
      if (error) throw error;

      // Add to History Tracer (Optimization 3)
      await supabase.from('ppa_history').insert([{
        ppa_id: selectedPPA.id,
        action_by: "MAYOR / LCE",
        action_type: finalStatus,
        change_summary: `Mayor reviewed and changed status to ${finalStatus}. Remarks saved to PPA structure.`
      }]);

      alert(`PPA successfully updated to ${finalStatus}`);
      setSelectedPPA(null);
      fetchLCEData();
    } catch (err) { 
      alert("Database Error: " + err.message); 
    } finally { 
      setIsProcessing(false); 
    }
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
          <p className="text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-widest border-l-4 border-indigo-500 pl-3">Executive Oversight & Audit Console</p>
        </div>
        <div className="flex gap-4">
          <button onClick={fetchLCEData} className="p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
            <RefreshCw size={20} />
          </button>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search departments..." className="pl-12 pr-6 py-3 bg-white border rounded-2xl text-sm font-semibold shadow-sm w-64 outline-none focus:border-indigo-500" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      {/* QUICK NAVIGATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div onClick={() => onNavigate('approved_list')} className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-[2.5rem] shadow-xl cursor-pointer hover:scale-[1.01] transition-all text-white relative overflow-hidden">
          <CheckCircle className="absolute -right-4 -top-4 w-24 h-24 opacity-20" />
          <h3 className="text-2xl font-black tracking-tighter uppercase leading-tight">Approved Registry</h3>
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mt-1">Consolidated Registry (Timestamped Exports)</p>
        </div>
        <div onClick={() => onNavigate('analytics')} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 cursor-pointer hover:scale-[1.01] transition-all relative overflow-hidden text-indigo-950">
          <BarChart3 className="absolute -right-4 -top-4 w-24 h-24 opacity-5" />
          <h3 className="text-2xl font-black tracking-tighter uppercase">Analytics Center</h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">FY 2026 Budget Compliance</p>
        </div>
      </div>

      {/* MAIN CONTENT TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b">
                <tr><th className="p-5">Department</th><th className="p-5">Activity Title</th><th className="p-5 text-right">Budget</th><th className="p-5 text-center">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPPAs.map((ppa) => (
                  <tr key={ppa.id} className="hover:bg-indigo-50/50 cursor-pointer transition-all" onClick={() => setSelectedPPA(ppa)}>
                    <td className="p-5 font-black text-indigo-900 text-[10px] uppercase">{ppa.office_name}</td>
                    <td className="p-5 text-slate-600 font-bold text-xs">{ppa.gad_activity}</td>
                    <td className="p-5 text-right font-mono font-black text-indigo-600 text-xs">₱{(ppa.total_mooe + ppa.total_ps + ppa.total_co).toLocaleString()}</td>
                    <td className="p-5 text-center">
                      <span className={`px-2 py-1 rounded-md font-black text-[8px] uppercase ${ppa.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {ppa.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-[#1e1b4b] p-8 rounded-[3rem] text-white shadow-2xl h-fit">
          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
             <TrendingUp size={20} className="text-amber-400" />
             <h3 className="text-lg font-black uppercase tracking-tighter">Budget Leaders</h3>
          </div>
          {summary.topOffices.map(([name, amount], i) => (
            <div key={i} className="flex flex-col py-3 border-b border-white/10 last:border-0">
              <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">{name}</span>
              <span className="font-mono text-sm font-black">₱{amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* --- DETAILED EXECUTIVE MODAL --- */}
      {selectedPPA && (
        <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-6xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-8 border-b bg-slate-50 flex justify-between items-start">
              <div className="flex-grow pr-10">
                <div className="flex items-center gap-3 mb-2">
                  <Landmark className="text-indigo-600" size={18} />
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{selectedPPA.office_name}</span>
                </div>
                <input 
                   className="text-4xl font-black text-indigo-950 uppercase tracking-tighter leading-tight w-full bg-transparent border-none outline-none focus:ring-2 ring-indigo-500 rounded-xl px-2"
                   value={editedPpa.gad_activity}
                   onChange={(e) => setEditedPpa({...editedPpa, gad_activity: e.target.value})}
                />
              </div>
              <button onClick={() => setSelectedPPA(null)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X size={32} className="text-slate-400" /></button>
            </div>

            <div className="p-10 overflow-y-auto space-y-10">
               <div className="grid lg:grid-cols-4 gap-10">
                  {/* Left Column: Editable Data Sections */}
                  <div className="lg:col-span-3 space-y-10">
                      <div className="grid md:grid-cols-2 gap-8">
                         {/* Gender Issue Edit */}
                         <div className="space-y-4">
                            <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                               <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 block">Gender Issue / Evidence</label>
                               <textarea 
                                  className="w-full bg-transparent border-none outline-none font-bold text-slate-700 leading-relaxed italic resize-none min-h-[100px]"
                                  value={editedPpa.gender_issue}
                                  onChange={(e) => setEditedPpa({...editedPpa, gender_issue: e.target.value})}
                               />
                            </div>
                            <input 
                               placeholder="Add Executive Remarks for this section..."
                               className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none focus:border-indigo-400"
                               value={sectionalComments.gender_issue}
                               onChange={(e) => setSectionalComments({...sectionalComments, gender_issue: e.target.value})}
                            />
                         </div>

                         {/* Objectives Edit */}
                         <div className="space-y-4">
                            <div className="bg-indigo-50/30 p-6 rounded-[2.5rem] border border-indigo-100">
                               <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 block">GAD Objectives</label>
                               <textarea 
                                  className="w-full bg-transparent border-none outline-none font-black text-indigo-900 leading-tight resize-none min-h-[100px]"
                                  value={editedPpa.gad_objective}
                                  onChange={(e) => setEditedPpa({...editedPpa, gad_objective: e.target.value})}
                               />
                            </div>
                            <input 
                               placeholder="Add Executive Remarks for Objectives..."
                               className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none focus:border-indigo-400"
                               value={sectionalComments.objectives}
                               onChange={(e) => setSectionalComments({...sectionalComments, objectives: e.target.value})}
                            />
                         </div>
                      </div>

                      {/* Financials and Indicators */}
                      <div className="grid md:grid-cols-2 gap-10">
                         <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2"><Target size={16}/> Success Indicators</h4>
                            <div className="bg-white border rounded-3xl p-6 space-y-3 shadow-sm">
                               {details.indicators.map((ind, i) => (
                                 <div key={i} className="text-xs font-bold text-slate-600 border-b pb-2 last:border-0 pb-2">• {ind.target_text} {ind.indicator_text}</div>
                               ))}
                            </div>
                            <input 
                               placeholder="Remarks for Indicators..."
                               className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none"
                               value={sectionalComments.indicators}
                               onChange={(e) => setSectionalComments({...sectionalComments, indicators: e.target.value})}
                            />
                         </div>

                         <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2"><Calculator size={16}/> Budget Breakdown</h4>
                            <div className="bg-indigo-900 text-white p-6 rounded-3xl flex justify-between items-center shadow-lg">
                               <span className="text-[10px] font-black uppercase tracking-widest">Total GAD Budget</span>
                               <span className="text-2xl font-mono font-black">₱{(selectedPPA.total_mooe + selectedPPA.total_ps + selectedPPA.total_co).toLocaleString()}</span>
                            </div>
                            <input 
                               placeholder="Remarks for Budgeting..."
                               className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none"
                               value={sectionalComments.budget}
                               onChange={(e) => setSectionalComments({...sectionalComments, budget: e.target.value})}
                            />
                         </div>
                      </div>
                  </div>

                  {/* Right Column: Tracer Log */}
                  <div className="lg:col-span-1 space-y-6">
                      <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 h-full">
                         <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-6">
                            <History className="text-indigo-600" size={20} />
                            <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-900">PPA Tracer Log</h3>
                         </div>
                         <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                            {history.map((h, i) => (
                               <div key={i} className="relative pl-6 border-l-2 border-indigo-200 py-1">
                                  <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white"></div>
                                  <p className="text-[10px] font-black text-indigo-900 uppercase">{h.action_type}</p>
                                  <p className="text-[9px] text-slate-400 font-bold mb-1">{new Date(h.created_at).toLocaleString()}</p>
                                  <p className="text-[10px] text-slate-500 leading-tight italic">{h.change_summary}</p>
                               </div>
                            ))}
                         </div>
                      </div>
                  </div>
               </div>
            </div>

            {/* Action Buttons */}
            <div className="p-10 bg-slate-50 border-t grid grid-cols-2 gap-6">
              <button 
                onClick={() => handleUpdateStatus('Approved')}
                disabled={isProcessing}
                className="bg-emerald-600 text-white font-black py-5 rounded-[2rem] uppercase text-lg tracking-widest hover:bg-emerald-700 transition-all shadow-xl active:scale-95 disabled:bg-slate-300"
              >
                Approve & Mainstream
              </button>
              <button 
                onClick={() => handleUpdateStatus('Returned')}
                disabled={isProcessing}
                className="bg-rose-600 text-white font-black py-5 rounded-[2rem] uppercase text-lg tracking-widest hover:bg-rose-700 transition-all shadow-xl active:scale-95 disabled:bg-slate-300"
              >
                Return for Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}