import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Award, TrendingUp, Landmark, FileText, Eye, X, BarChart3, 
  Target, Wallet, Search, CheckCircle, Database, MessageSquare, 
  Send, History, Zap, Layers, Calculator, ArrowLeft, RefreshCw,
  PieChart, Trash2, Plus, BrainCircuit, ShieldAlert, AlertCircle // Added AlertCircle
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
  
  const [history, setHistory] = useState([]);
  
  // Executive Editing States
  const [editedPpa, setEditedPpa] = useState({ gad_activity: '', gad_objective: '', gender_issue: '' });
  const [localBudget, setLocalBudget] = useState([]);
  const [localIndicators, setLocalIndicators] = useState([]);
  const [sectionalComments, setSectionalComments] = useState({
    gender_issue: '', objectives: '', activities: '', indicators: '', budget: ''
  });

  useEffect(() => {
    fetchLCEData();
  }, []);

  useEffect(() => {
    if (selectedPPA) {
      const fetchPPADetails = async () => {
        const { data: ind } = await supabase.from('ppa_indicators').select('*').eq('ppa_id', selectedPPA.id);
        const { data: bud } = await supabase.from('ppa_budget_items').select('*').eq('ppa_id', selectedPPA.id);
        const { data: hist } = await supabase.from('ppa_history').select('*').eq('ppa_id', selectedPPA.id).order('created_at', { ascending: false });
        
        setLocalIndicators(ind || []);
        setLocalBudget(bud || []);
        setHistory(hist || []);
        
        setEditedPpa({
          gad_activity: selectedPPA.gad_activity || '',
          gad_objective: selectedPPA.gad_objective || '',
          gender_issue: selectedPPA.gender_issue || ''
        });

        const existingComments = selectedPPA.sectional_comments || {};
        setSectionalComments({
          gender_issue: existingComments.gender_issue || '',
          objectives: existingComments.objectives || '',
          activities: existingComments.activities || '',
          indicators: existingComments.indicators || '',
          budget: existingComments.budget || ''
        });
      };
      fetchPPADetails();
    }
  }, [selectedPPA]);

  const lceTotalBudget = localBudget.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

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
        const total = proposals.reduce((sum, p) => sum + (parseFloat(p.gad_budget) || 0), 0);
        const approved = proposals.filter(p => p.status === 'Approved')
                                  .reduce((sum, p) => sum + (parseFloat(p.gad_budget) || 0), 0);
        
        const distinctOffices = new Set(proposals.map(p => p.office_name)).size;
        setSummary({
          totalBudget: total,
          approvedBudget: approved,
          officeCount: offices?.length || 1,
          submissionRate: ((distinctOffices / (offices?.length || 1)) * 100).toFixed(0),
          topOffices: Object.entries(proposals.reduce((acc, p) => {
            acc[p.office_name] = (acc[p.office_name] || 0) + (parseFloat(p.gad_budget) || 0);
            return acc;
          }, {})).sort(([, a], [, b]) => b - a).slice(0, 5)
        });
        setSubmittedPPAs(proposals);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateBudgetField = (index, field, value) => {
    const updated = [...localBudget];
    updated[index][field] = value;
    setLocalBudget(updated);
  };

  const handleUpdateStatus = async (targetStatus) => {
    if (!selectedPPA) return;
    setIsProcessing(true);
    
    const finalStatus = targetStatus === 'Returned' ? 'For Revision' : 'Approved';

    try {
      const { error: ppaError } = await supabase
        .from('gad_proposals')
        .update({ 
          status: finalStatus,
          gad_activity: editedPpa.gad_activity,
          gad_objective: editedPpa.gad_objective,
          gender_issue: editedPpa.gender_issue,
          gad_budget: lceTotalBudget,
          sectional_comments: sectionalComments,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPPA.id);
      
      if (ppaError) throw ppaError;

      await supabase.from('ppa_budget_items').delete().eq('ppa_id', selectedPPA.id);
      const { error: budgetError } = await supabase
        .from('ppa_budget_items')
        .insert(localBudget.map(item => ({
            ppa_id: selectedPPA.id,
            item_description: item.item_description,
            fund_type: item.fund_type,
            amount: item.amount
        })));

      if (budgetError) throw budgetError;

      await supabase.from('ppa_history').insert([{
        ppa_id: selectedPPA.id,
        action_by: "MAYOR / LCE",
        action_type: finalStatus,
        change_summary: `Executive Action: ${finalStatus}. Plan finalized by Mayor.`
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

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center animate-pulse">
        <RefreshCw size={48} className="text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="font-black uppercase text-indigo-900 tracking-widest">Accessing Executive Registry...</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-black text-indigo-950 tracking-tighter uppercase leading-none">Mayor's Overview</h1>
          <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] tracking-widest flex items-center gap-2">
            <ShieldAlert size={14} className="text-indigo-500"/> Executive Oversight & Audit Console
          </p>
        </div>
        <div className="flex gap-4">
          <button onClick={fetchLCEData} className="p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
            <RefreshCw size={20} />
          </button>
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search Activity..." className="w-full pl-12 pr-6 py-4 bg-white border-none rounded-2xl outline-none focus:ring-2 ring-indigo-500 text-sm font-bold shadow-inner" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div onClick={() => onNavigate('approved_list')} className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-[2.5rem] shadow-xl cursor-pointer hover:scale-[1.01] transition-all text-white group relative overflow-hidden">
          <CheckCircle className="absolute -right-4 -top-4 w-32 h-32 opacity-10 group-hover:rotate-12 transition-transform" />
          <h3 className="text-2xl font-black tracking-tighter uppercase">Approved Registry</h3>
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mt-1">FY 2026 Consolidated Plans</p>
        </div>
        <div onClick={() => onNavigate('analytics')} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 cursor-pointer hover:scale-[1.01] transition-all text-indigo-950 group relative overflow-hidden">
          <BarChart3 className="absolute -right-4 -top-4 w-32 h-32 opacity-5 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-black tracking-tighter uppercase">Compliance Analytics</h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Real-time Budget Compliance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b">
                <tr><th className="p-6">Department</th><th className="p-6">Activity</th><th className="p-6 text-right">Budget</th><th className="p-6 text-center">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPPAs.map((ppa) => (
                  <tr key={ppa.id} className="hover:bg-indigo-50/50 cursor-pointer transition-all group" onClick={() => setSelectedPPA(ppa)}>
                    <td className="p-6 font-black text-indigo-900 text-[10px] uppercase">{ppa.office_name}</td>
                    <td className="p-6 text-slate-600 font-bold text-xs group-hover:text-indigo-600">{ppa.gad_activity}</td>
                    <td className="p-6 text-right font-mono font-black text-indigo-600">₱{parseFloat(ppa.gad_budget || 0).toLocaleString()}</td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full font-black text-[9px] uppercase border-2 ${ppa.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {ppa.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-[#1e1b4b] p-8 rounded-[3rem] text-white shadow-2xl h-fit sticky top-8">
          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
             <TrendingUp size={20} className="text-amber-400" />
             <h3 className="text-lg font-black uppercase tracking-tighter">Budget Leaders</h3>
          </div>
          <div className="space-y-4">
            {summary.topOffices.map(([name, amount], i) => (
                <div key={i} className="flex flex-col p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                    <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">{name}</span>
                    <span className="font-mono text-lg font-black text-amber-400">₱{amount.toLocaleString()}</span>
                </div>
            ))}
          </div>
        </div>
      </div>

      {selectedPPA && (
        <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-7xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-start">
              <div className="flex-grow pr-10">
                <div className="flex items-center gap-3 mb-2">
                  <Landmark className="text-indigo-600" size={18} />
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{selectedPPA.office_name}</span>
                </div>
                <input className="text-4xl font-black text-indigo-950 uppercase tracking-tighter leading-tight w-full bg-transparent border-none outline-none focus:ring-2 ring-indigo-500 rounded-xl px-2" value={editedPpa.gad_activity || ''} onChange={(e) => setEditedPpa({...editedPpa, gad_activity: e.target.value})} />
              </div>
              <button onClick={() => setSelectedPPA(null)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X size={32} className="text-slate-400" /></button>
            </div>

            <div className="p-10 overflow-y-auto space-y-10">
               <div className="grid lg:grid-cols-4 gap-10">
                  <div className="lg:col-span-3 space-y-10">
                      <div className="grid md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                               <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 block">Gender Issue / Evidence</label>
                               <textarea className="w-full bg-transparent border-none outline-none font-bold text-slate-700 leading-relaxed italic resize-none min-h-[120px]" value={editedPpa.gender_issue || ''} onChange={(e) => setEditedPpa({...editedPpa, gender_issue: e.target.value})} />
                            </div>
                            <input placeholder="Mayor's Remarks..." className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none" value={sectionalComments.gender_issue || ''} onChange={(e) => setSectionalComments({...sectionalComments, gender_issue: e.target.value})} />
                         </div>
                         <div className="space-y-4">
                            <div className="bg-indigo-50/30 p-6 rounded-[2.5rem] border border-indigo-100">
                               <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 block">GAD Objectives</label>
                               <textarea className="w-full bg-transparent border-none outline-none font-black text-indigo-900 leading-tight resize-none min-h-[120px]" value={editedPpa.gad_objective || ''} onChange={(e) => setEditedPpa({...editedPpa, gad_objective: e.target.value})} />
                            </div>
                            <input placeholder="Objective Remarks..." className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none" value={sectionalComments.objectives || ''} onChange={(e) => setSectionalComments({...sectionalComments, objectives: e.target.value})} />
                         </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2"><PieChart size={16}/> Budget (Executive Review)</h4>
                          <button onClick={() => setLocalBudget([...localBudget, { item_description: '', fund_type: 'MOOE', amount: 0 }])} className="text-[10px] font-black bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2"> <Plus size={14} /> Add Item </button>
                        </div>
                        <div className="border-2 border-slate-100 rounded-[2rem] overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b">
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Description</th><th className="px-6 py-4 text-center">Fund</th><th className="px-6 py-4 text-right">Amount</th><th className="px-4"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {localBudget.map((item, i) => (
                                <tr key={i}>
                                  <td className="px-6 py-3"><input className="w-full bg-transparent border-none outline-none font-semibold text-slate-700" value={item.item_description || ''} onChange={(e) => updateBudgetField(i, 'item_description', e.target.value)} /></td>
                                  <td className="px-6 py-3 text-center"><select className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black border-none outline-none" value={item.fund_type || 'MOOE'} onChange={(e) => updateBudgetField(i, 'fund_type', e.target.value)}><option value="MOOE">MOOE</option><option value="PS">PS</option><option value="CO">CO</option></select></td>
                                  <td className="px-6 py-3 text-right"><input type="number" className="w-32 bg-transparent border-none outline-none text-right font-mono font-bold text-indigo-900" value={item.amount || 0} onChange={(e) => updateBudgetField(i, 'amount', e.target.value)} /></td>
                                  <td className="px-4"><button onClick={() => setLocalBudget(localBudget.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-indigo-950 text-white font-black">
                              <tr><td colSpan="2" className="px-6 py-5 text-[10px] uppercase tracking-widest">Executive Total</td><td className="px-6 py-5 text-right text-2xl font-mono">₱{lceTotalBudget.toLocaleString()}</td><td></td></tr>
                            </tfoot>
                          </table>
                        </div>
                        <input placeholder="Budget Remarks..." className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none" value={sectionalComments.budget || ''} onChange={(e) => setSectionalComments({...sectionalComments, budget: e.target.value})} />
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2"><Target size={16}/> Success Indicators</h4>
                        <div className="bg-white border-2 border-slate-50 rounded-3xl p-6 grid md:grid-cols-2 gap-4 shadow-sm">
                           {localIndicators.map((ind, i) => (
                             <div key={i} className="text-xs font-bold text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                               <span className="text-indigo-600 font-black uppercase text-[9px] block mb-1">Target: {ind.target_text}</span> {ind.indicator_text}
                             </div>
                           ))}
                        </div>
                        <input placeholder="Indicator Remarks..." className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none" value={sectionalComments.indicators || ''} onChange={(e) => setSectionalComments({...sectionalComments, indicators: e.target.value})} />
                      </div>
                  </div>

                  <div className="lg:col-span-1 space-y-6">
                      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm h-fit">
                         <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                            <History className="text-indigo-600" size={20} />
                            <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-900">PPA Tracer Log</h3>
                         </div>
                         <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                            {history.map((h, i) => (
                               <div key={i} className="relative pl-6 border-l-2 border-indigo-100 py-1">
                                  <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm"></div>
                                  <p className="text-[10px] font-black text-indigo-900 uppercase">{h.action_type}</p>
                                  <p className="text-[9px] text-slate-400 font-bold mb-1">{new Date(h.created_at).toLocaleString()}</p>
                                  <p className="text-[10px] text-slate-500 leading-tight italic mb-2">"{h.change_summary}"</p>
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[8px] font-black border border-indigo-100 uppercase"> Performed By: {h.action_by || 'System'} </span>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                  </div>
               </div>
            </div>

            <div className="p-10 bg-slate-50 border-t grid grid-cols-2 gap-6">
              <button onClick={() => handleUpdateStatus('Approved')} disabled={isProcessing} className="bg-emerald-600 text-white font-black py-5 rounded-[2rem] uppercase text-lg hover:bg-emerald-700 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50">
                <CheckCircle size={24}/> Sync & Approve Plan
              </button>
              <button onClick={() => handleUpdateStatus('Returned')} disabled={isProcessing} className="bg-rose-600 text-white font-black py-5 rounded-[2rem] uppercase text-lg hover:bg-rose-700 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50">
                <AlertCircle size={24}/> Return with Executive Edits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}