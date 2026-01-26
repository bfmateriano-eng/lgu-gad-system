import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import UserManagement from '../admin/UserManagement'; 
import { 
  CheckCircle, AlertCircle, Eye, Search, 
  Building2, MessageSquare, ArrowLeft, RefreshCw, 
  Target, List, Calculator, Calendar,
  BrainCircuit, ShieldAlert, Zap, Layers, History, Edit3,
  Users, ClipboardList, LogOut, Printer, PieChart, FileText, 
  Trash2, Plus, X, Landmark
} from 'lucide-react';

export default function ReviewerDashboard({ session, onSignOut }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [details, setDetails] = useState({ indicators: [], budget: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState([]);
  
  const [currentView, setCurrentView] = useState('review');

  // Reviewer Editing States (Mirrored from LCE View)
  const [editedPpa, setEditedPpa] = useState({
    gad_activity: '',
    gad_objective: '',
    gender_issue: ''
  });
  const [localBudget, setLocalBudget] = useState([]); 
  const [localIndicators, setLocalIndicators] = useState([]);
  const [sectionalComments, setSectionalComments] = useState({
    gender_issue: '', objectives: '', activities: '', indicators: '', budget: ''
  });

  const [aiScore, setAiScore] = useState(0);
  const [aiFeedback, setAiFeedback] = useState([]);

  useEffect(() => {
    fetchAllProposals();
  }, []);

  useEffect(() => {
    if (selectedProposal) {
      const fetchDetails = async () => {
        const { data: ind } = await supabase.from('ppa_indicators').select('*').eq('ppa_id', selectedProposal.id);
        const { data: bud } = await supabase.from('ppa_budget_items').select('*').eq('ppa_id', selectedProposal.id);
        const { data: hist } = await supabase.from('ppa_history').select('*').eq('ppa_id', selectedProposal.id).order('created_at', { ascending: false });
        
        setLocalIndicators(ind || []);
        setLocalBudget(bud || []);
        setHistory(hist || []);
        
        setEditedPpa({
          gad_activity: selectedProposal.gad_activity || '',
          gad_objective: selectedProposal.gad_objective || '',
          gender_issue: selectedProposal.gender_issue || ''
        });

        const existingComments = selectedProposal.sectional_comments || {};
        setSectionalComments({
          gender_issue: existingComments.gender_issue || '',
          objectives: existingComments.objectives || '',
          activities: existingComments.activities || '',
          indicators: existingComments.indicators || '',
          budget: existingComments.budget || ''
        });
        
        runAIAudit(selectedProposal, ind || []);
      };
      fetchDetails();
    }
  }, [selectedProposal]);

  const reviewerTotalBudget = localBudget.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const runAIAudit = (proposal, indicators) => {
    let score = 100;
    let feedback = [];
    if (!proposal.gad_objective || proposal.gad_objective.length < 20) { 
      score -= 20; 
      feedback.push("Objective is too brief."); 
    }
    if (indicators.length === 0) { 
      score -= 30; 
      feedback.push("CRITICAL: Missing Success Indicators."); 
    }
    setAiScore(score);
    setAiFeedback(feedback);
  };

  async function fetchAllProposals() {
    setLoading(true);
    const { data } = await supabase
      .from('gad_proposals')
      .select('*')
      .neq('status', 'Draft') 
      .order('created_at', { ascending: false });
    if (data) setProposals(data);
    setLoading(false);
  }

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedProposal) return;
    setIsProcessing(true);
    
    try {
      const { error: ppaError } = await supabase
        .from('gad_proposals')
        .update({ 
          status: newStatus, 
          gad_activity: editedPpa.gad_activity,
          gad_objective: editedPpa.gad_objective,
          gender_issue: editedPpa.gender_issue,
          gad_budget: reviewerTotalBudget, 
          sectional_comments: sectionalComments,
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedProposal.id);

      if (ppaError) throw ppaError;

      await supabase.from('ppa_budget_items').delete().eq('ppa_id', selectedProposal.id);
      const { error: budgetError } = await supabase
        .from('ppa_budget_items')
        .insert(localBudget.map(item => ({
            ppa_id: selectedProposal.id,
            item_description: item.item_description,
            fund_type: item.fund_type,
            amount: item.amount
        })));

      if (budgetError) throw budgetError;

      await supabase.from('ppa_history').insert([{
        ppa_id: selectedProposal.id,
        action_by: "GAD UNIT",
        action_type: newStatus,
        change_summary: `PPA status: ${newStatus}. Updated by GAD Unit Auditor.`
      }]);

      alert(`Success! PPA is now ${newStatus}`);
      setSelectedProposal(null);
      fetchAllProposals();
    } catch (err) {
      alert("Database Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateBudgetField = (index, field, value) => {
    const updated = [...localBudget];
    updated[index][field] = value;
    setLocalBudget(updated);
  };

  const handlePrint = () => window.print();

  const filtered = proposals.filter(p => 
    p.office_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.gad_activity?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center animate-pulse">
        <RefreshCw size={48} className="text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="font-black uppercase text-indigo-900 tracking-widest">Loading Submissions...</p>
      </div>
    </div>
  );

  if (currentView === 'users') {
    return <UserManagement onBack={() => setCurrentView('review')} />;
  }

  return (
    <div className="p-8 md:p-12 space-y-8 animate-in fade-in duration-500 bg-slate-50 min-h-screen">
      {selectedProposal ? (
        <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-7xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            
            {/* --- MODAL HEADER --- */}
            <div className="p-8 border-b bg-slate-50 flex justify-between items-start">
              <div className="flex-grow pr-10">
                <div className="flex items-center gap-3 mb-2">
                  <Landmark className="text-indigo-600" size={18} />
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{selectedProposal.office_name}</span>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black border uppercase ${aiScore > 70 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    <BrainCircuit size={12} /> AI Score: {aiScore}%
                  </div>
                </div>
                <input 
                   className="text-4xl font-black text-indigo-950 uppercase tracking-tighter leading-tight w-full bg-transparent border-none outline-none focus:ring-2 ring-indigo-500 rounded-xl px-2"
                   value={editedPpa.gad_activity}
                   onChange={(e) => setEditedPpa({...editedPpa, gad_activity: e.target.value})}
                />
              </div>
              <button onClick={() => setSelectedProposal(null)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X size={32} className="text-slate-400" /></button>
            </div>

            <div className="p-10 overflow-y-auto space-y-10">
               <div className="grid lg:grid-cols-4 gap-10">
                  
                  {/* --- LEFT CONTENT AREA --- */}
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
                               placeholder="Technical Remarks for this section..."
                               className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none"
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
                               placeholder="Technical Remarks for Objectives..."
                               className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none"
                               value={sectionalComments.objectives}
                               onChange={(e) => setSectionalComments({...sectionalComments, objectives: e.target.value})}
                            />
                         </div>
                      </div>

                      {/* --- INDICATORS VIEW --- */}
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2"><Target size={16}/> Success Indicators</h4>
                        <div className="bg-white border rounded-3xl p-6 grid md:grid-cols-2 gap-4 shadow-sm">
                           {localIndicators.map((ind, i) => (
                             <div key={i} className="text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                               <span className="text-indigo-600 font-black uppercase text-[9px] block mb-1">Target: {ind.target_text}</span>
                               {ind.indicator_text}
                             </div>
                           ))}
                        </div>
                        <input 
                            placeholder="Remarks for Indicators..."
                            className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none"
                            value={sectionalComments.indicators}
                            onChange={(e) => setSectionalComments({...sectionalComments, indicators: e.target.value})}
                        />
                      </div>

                      {/* --- EDITABLE BUDGET TABLE --- */}
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2"><PieChart size={16}/> Itemized Technical Budget</h4>
                          <button 
                            onClick={() => setLocalBudget([...localBudget, { item_description: '', fund_type: 'MOOE', amount: 0 }])}
                            className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2"
                          >
                            <Plus size={14} /> Add Item
                          </button>
                        </div>
                        <div className="border-2 border-slate-100 rounded-[2rem] overflow-hidden">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b">
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Expense Description</th>
                                <th className="px-6 py-4 text-center">Type</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-4"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {localBudget.map((item, i) => (
                                <tr key={i}>
                                  <td className="px-6 py-3">
                                    <input className="w-full bg-transparent border-none outline-none font-semibold text-slate-700"
                                      value={item.item_description || ''} onChange={(e) => updateBudgetField(i, 'item_description', e.target.value)} />
                                  </td>
                                  <td className="px-6 py-3 text-center">
                                    <select className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-black border-none"
                                      value={item.fund_type || 'MOOE'} onChange={(e) => updateBudgetField(i, 'fund_type', e.target.value)}>
                                      <option value="MOOE">MOOE</option><option value="PS">PS</option><option value="CO">CO</option>
                                    </select>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <input type="number" className="w-24 bg-transparent border-none outline-none text-right font-mono font-bold"
                                      value={item.amount || 0} onChange={(e) => updateBudgetField(i, 'amount', e.target.value)} />
                                  </td>
                                  <td className="px-4">
                                    <button onClick={() => setLocalBudget(localBudget.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-indigo-900 text-white font-black">
                              <tr>
                                <td colSpan="2" className="px-6 py-4 text-[10px] uppercase tracking-widest">Audited Total request</td>
                                <td className="px-6 py-4 text-right text-xl font-mono">₱{reviewerTotalBudget.toLocaleString()}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        <input 
                           placeholder="Audit Remarks for Budgeting..."
                           className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 outline-none"
                           value={sectionalComments.budget}
                           onChange={(e) => setSectionalComments({...sectionalComments, budget: e.target.value})}
                        />
                      </div>
                  </div>

                  {/* --- RIGHT COLUMN SIDEBAR --- */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#1e1b4b] text-white rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                      <div className="flex items-center gap-3 border-b border-indigo-800 pb-4">
                        <Zap className="text-amber-400 fill-amber-400" size={24} />
                        <h3 className="font-black uppercase tracking-widest text-xs">AI Smart Auditor</h3>
                      </div>
                      <div className="text-center py-4">
                          <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">Compliance Score</p>
                          <div className="text-5xl font-black text-amber-400">{aiScore}%</div>
                      </div>
                      <div className="space-y-3">
                        {aiFeedback.map((f, i) => (
                          <div key={i} className="flex gap-3 text-[10px] font-bold text-indigo-100">
                            <ShieldAlert size={14} className="text-amber-400 shrink-0" />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 h-fit">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                          <History className="text-indigo-600" size={20} />
                          <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-900">PPA Tracer Log</h3>
                        </div>
                        <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2">
                            {history.map((h, i) => (
                                <div key={i} className="relative pl-6 border-l-2 border-indigo-100 py-1">
                                    <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm"></div>
                                    <p className="text-[10px] font-black text-indigo-900 uppercase">{h.action_type}</p>
                                    <p className="text-[9px] text-slate-400 font-bold">{new Date(h.created_at).toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">{h.change_summary}</p>
                                    <div className="mt-2 flex items-center gap-1.5">
                                      <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[8px] font-black border border-indigo-100 uppercase">
                                        Performed By: {h.action_by || 'System'}
                                      </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* --- ACTION BAR --- */}
            <div className="p-10 bg-slate-50 border-t grid grid-cols-2 gap-6">
              <button 
                disabled={isProcessing}
                onClick={() => handleUpdateStatus('Approved')} 
                className="bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-700 active:scale-95 transition-all shadow-xl disabled:bg-slate-300"
              >
                <CheckCircle size={24}/> Verify & Approve
              </button>
              <button 
                disabled={isProcessing}
                onClick={() => handleUpdateStatus('For Revision')} 
                className="bg-amber-500 text-white py-5 rounded-[2rem] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-600 active:scale-95 transition-all shadow-xl disabled:bg-slate-300"
              >
                <AlertCircle size={24}/> Return with Edits
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          {/* Main List View */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h2 className="text-5xl font-black text-indigo-950 uppercase tracking-tighter leading-none">Review Console</h2>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
                <ShieldAlert size={14} className="text-indigo-500"/> Awaiting GAD Unit Verification
              </p>
            </div>
            
            <div className="flex items-center gap-3">
               <button onClick={() => setCurrentView('review')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all ${currentView === 'review' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-indigo-200'}`}>
                 <ClipboardList size={18}/> PPAs
               </button>
               <button onClick={() => setCurrentView('users')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all ${currentView === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-indigo-200'}`}>
                 <Users size={18}/> Users
               </button>
               <button onClick={onSignOut} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all">
                 <LogOut size={20} />
               </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 mb-10 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" placeholder="Search Activity..."
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 ring-indigo-500 text-sm font-bold shadow-inner"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={fetchAllProposals} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="grid gap-6">
            {filtered.length > 0 ? filtered.map(item => (
              <div key={item.id} onClick={() => setSelectedProposal(item)} className="group bg-white border-2 border-slate-100 p-8 rounded-[3rem] cursor-pointer hover:border-indigo-600 transition-all hover:shadow-2xl flex items-center justify-between active:scale-[0.98]">
                <div className="flex items-center gap-6">
                  <div className="bg-slate-50 p-6 rounded-3xl group-hover:bg-indigo-600 group-hover:text-white transition-all text-slate-400 shadow-sm">
                    <Building2 size={32}/>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-indigo-950 uppercase leading-none group-hover:text-indigo-600 transition-colors tracking-tighter">{item.gad_activity}</h4>
                    <p className="text-[11px] font-black text-indigo-400 mt-2 uppercase tracking-[0.2em]">{item.office_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-right hidden md:block">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Budget Request</p>
                        <p className="font-mono font-bold text-slate-600 text-lg">₱{parseFloat(item.gad_budget || 0).toLocaleString()}</p>
                    </div>
                    <span className={`text-[10px] font-black px-5 py-2 rounded-full border-2 uppercase tracking-widest ${
                        item.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        item.status === 'For Revision' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                        'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                        {item.status}
                    </span>
                    <Eye size={28} className="text-slate-200 group-hover:text-indigo-600 transition-all mr-4" />
                </div>
              </div>
            )) : (
              <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardList size={32} className="text-slate-300" />
                </div>
                <p className="font-black text-slate-400 uppercase tracking-widest">No pending proposals found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}