import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import UserManagement from '../admin/UserManagement'; 
import { 
  CheckCircle, AlertCircle, Eye, Search, 
  Building2, MessageSquare, ArrowLeft, RefreshCw, 
  Target, List, Calculator, Calendar,
  BrainCircuit, ShieldAlert, Zap, Layers, History, Edit3,
  Users, ClipboardList, LogOut, Printer, PieChart, FileText
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

  const [editedPpa, setEditedPpa] = useState({});
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
        
        setDetails({ indicators: ind || [], budget: bud || [] });
        setHistory(hist || []);
        
        setEditedPpa({
          gad_activity: selectedProposal.gad_activity,
          gad_objective: selectedProposal.gad_objective,
          gender_issue: selectedProposal.gender_issue
        });

        setSectionalComments(selectedProposal.sectional_comments || {
          gender_issue: '', objectives: '', activities: '', indicators: '', budget: ''
        });
        
        runAIAudit(selectedProposal, ind || []);
      };
      fetchDetails();
    }
  }, [selectedProposal]);

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
      const { data, error } = await supabase
        .from('gad_proposals')
        .update({ 
          status: newStatus, 
          gad_activity: editedPpa.gad_activity,
          gad_objective: editedPpa.gad_objective,
          gender_issue: editedPpa.gender_issue,
          sectional_comments: sectionalComments,
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedProposal.id)
        .select();

      if (error) throw error;

      await supabase.from('ppa_history').insert([{
        ppa_id: selectedProposal.id,
        action_by: "GAD UNIT AUDITOR",
        action_type: newStatus,
        change_summary: `PPA status changed to ${newStatus}. Sectional remarks saved.`
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

  const handlePrint = () => {
    window.print();
  };

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
        <div className="max-w-7xl mx-auto space-y-8 animate-in zoom-in-95 duration-300 pb-20 print:p-0 print:m-0">
          
          {/* HEADER ACTIONS - Hidden on Print */}
          <div className="flex justify-between items-center print:hidden">
            <button onClick={() => setSelectedProposal(null)} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all">
              <ArrowLeft size={16}/> Back to List
            </button>
            <div className="flex gap-4">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-white border-2 border-slate-100 text-slate-900 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-slate-50 transition-all shadow-sm"
              >
                <Printer size={16} /> Print for File
              </button>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-xs uppercase ${aiScore > 70 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                <BrainCircuit size={16} /> Logic Score: {aiScore}%
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              
              {/* MAIN PPA DOCUMENT CONTAINER */}
              <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-xl space-y-10 print:border-none print:shadow-none print:p-4">
                
                {/* 1. DOCUMENT HEADER */}
                <div className="border-b pb-6 flex justify-between items-start">
                  <div className="flex-grow pr-10">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1 block print:hidden">Activity Title (Editable)</label>
                    <input 
                      className="text-3xl font-black text-indigo-950 tracking-tighter leading-tight w-full bg-slate-50 border-none outline-none focus:ring-2 ring-indigo-500 rounded-xl px-4 py-2 print:bg-white print:p-0 print:text-2xl"
                      value={editedPpa.gad_activity}
                      onChange={(e) => setEditedPpa({...editedPpa, gad_activity: e.target.value})}
                    />
                    <p className="font-bold text-indigo-600 uppercase text-xs mt-4 tracking-widest flex items-center gap-2">
                       <Building2 size={14}/> {selectedProposal.office_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Consolidated GAD Budget</p>
                    <p className="text-3xl font-mono font-black text-indigo-900">₱{selectedProposal.gad_budget?.toLocaleString()}</p>
                  </div>
                </div>

                {/* 2. LOGICAL FRAMEWORK breakdown */}
                <div className="grid gap-8">
                    <div className="space-y-4">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 print:bg-white print:border-slate-200">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14} className="text-indigo-500"/> Gender Issue / GAD Mandate</h4>
                            <textarea 
                                className="w-full bg-transparent border-none outline-none text-sm text-slate-700 font-medium leading-relaxed resize-none min-h-[80px]"
                                value={editedPpa.gender_issue}
                                onChange={(e) => setEditedPpa({...editedPpa, gender_issue: e.target.value})}
                            />
                        </div>
                        <input 
                            placeholder="Remarks for Gender Issue..."
                            className="w-full text-[11px] font-bold text-indigo-600 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 outline-none print:hidden"
                            value={sectionalComments.gender_issue}
                            onChange={(e) => setSectionalComments({...sectionalComments, gender_issue: e.target.value})}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-50 space-y-4 print:bg-white print:border-indigo-100">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Zap size={14}/> GAD Result Statement / Objective</h4>
                            <textarea 
                                className="w-full bg-transparent border-none outline-none text-sm font-bold text-indigo-900 leading-relaxed italic resize-none min-h-[80px]"
                                value={editedPpa.gad_objective}
                                onChange={(e) => setEditedPpa({...editedPpa, gad_objective: e.target.value})}
                            />
                        </div>
                        <input 
                            placeholder="Remarks for Objective..."
                            className="w-full text-[11px] font-bold text-indigo-600 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 outline-none print:hidden"
                            value={sectionalComments.objectives}
                            onChange={(e) => setSectionalComments({...sectionalComments, objectives: e.target.value})}
                        />
                    </div>
                </div>

                {/* 3. INDICATORS & TARGETS SECTION */}
                <div className="space-y-6 pt-8">
                    <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2"><Target size={16} className="text-indigo-400"/> Success Indicators</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                        {details.indicators.map((ind, i) => (
                        <div key={i} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm print:border-slate-300">
                            <span className="text-sm font-semibold text-slate-600">{ind.indicator_text}</span>
                            <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg uppercase">{ind.target_text}</span>
                        </div>
                        ))}
                    </div>
                    <input 
                        placeholder="Remarks for Indicators..."
                        className="w-full text-[11px] font-bold text-indigo-600 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 outline-none print:hidden"
                        value={sectionalComments.indicators}
                        onChange={(e) => setSectionalComments({...sectionalComments, indicators: e.target.value})}
                    />
                </div>

                {/* 4. DETAILED BUDGET TABLE */}
                <div className="space-y-6 pt-8">
                    <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2">
                        <PieChart size={16} className="text-indigo-400"/> Detailed Itemized Budget
                    </h4>
                    <div className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden shadow-sm print:border-slate-300">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Expense Description</th>
                                    <th className="px-6 py-4">Fund Type</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {details.budget.map((item, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4 font-semibold text-slate-700">{item.item_description}</td>
                                        <td className="px-6 py-4"><span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg border border-indigo-100">{item.fund_type}</span></td>
                                        <td className="px-6 py-4 text-right font-mono font-bold">₱{item.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-indigo-900 text-white font-black">
                                    <td colSpan="2" className="px-6 py-4 text-[10px] uppercase tracking-widest">Total GAD Request</td>
                                    <td className="px-6 py-4 text-right text-xl font-mono">₱{selectedProposal.gad_budget?.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <input 
                        placeholder="Remarks for Budgeting..."
                        className="w-full text-[11px] font-bold text-indigo-600 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 outline-none print:hidden"
                        value={sectionalComments.budget}
                        onChange={(e) => setSectionalComments({...sectionalComments, budget: e.target.value})}
                    />
                </div>
              </div>

              {/* ACTION BUTTONS - Hidden on Print */}
              <div className="grid grid-cols-2 gap-4 print:hidden">
                <button 
                  disabled={isProcessing}
                  onClick={() => handleUpdateStatus('Approved')} 
                  className="bg-emerald-600 text-white py-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-emerald-700 active:scale-95 transition-all shadow-xl disabled:bg-slate-300"
                >
                  <CheckCircle size={24}/> APPROVE & MAINSTREAM
                </button>
                <button 
                  disabled={isProcessing}
                  onClick={() => handleUpdateStatus('For Revision')} 
                  className="bg-amber-500 text-white py-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-amber-600 active:scale-95 transition-all shadow-xl disabled:bg-slate-300"
                >
                  <AlertCircle size={24}/> RETURN FOR REVISION
                </button>
              </div>
            </div>

            {/* SIDEBAR - Hidden on Print */}
            <div className="lg:col-span-1 space-y-6 print:hidden">
              <div className="bg-[#1e1b4b] text-white rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                <div className="flex items-center gap-3 border-b border-indigo-800 pb-4">
                  <Zap className="text-amber-400 fill-amber-400" size={24} />
                  <h3 className="font-black uppercase tracking-widest text-xs">AI Smart Auditor</h3>
                </div>
                <div className="text-center">
                    <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">Compliance Score</p>
                    <div className="text-5xl font-black text-amber-400">{aiScore}%</div>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <History className="text-indigo-600" size={20} />
                  <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-900">PPA Tracer Log</h3>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {history.map((h, i) => (
                        <div key={i} className="relative pl-6 border-l-2 border-indigo-100 py-1">
                            <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white"></div>
                            <p className="text-[10px] font-black text-indigo-900 uppercase">{h.action_type}</p>
                            <p className="text-[9px] text-slate-500 font-medium">{new Date(h.created_at).toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-tight">{h.change_summary}</p>
                        </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          {/* ... Existing List View Code ... */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h2 className="text-5xl font-black text-indigo-950 uppercase tracking-tighter">Review Console</h2>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
                <ShieldAlert size={14} className="text-indigo-500"/> Awaiting GAD Unit Verification
              </p>
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                onClick={() => setCurrentView('review')}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all ${currentView === 'review' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-indigo-200'}`}
               >
                 <ClipboardList size={18}/> PPAs
               </button>
               <button 
                onClick={() => setCurrentView('users')}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all ${currentView === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-indigo-200'}`}
               >
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
                type="text" placeholder="Search by office or activity..."
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
                        <p className="font-mono font-bold text-slate-600">₱{item.gad_budget?.toLocaleString()}</p>
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