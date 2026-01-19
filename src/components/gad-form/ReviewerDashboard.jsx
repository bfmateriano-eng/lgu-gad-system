import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  CheckCircle, AlertCircle, Eye, Search, 
  Building2, MessageSquare, ArrowLeft, RefreshCw, 
  Target, List, Calculator, Printer, Calendar,
  BrainCircuit, ShieldAlert, Zap, Landmark
} from 'lucide-react';

export default function ReviewerDashboard({ session }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [details, setDetails] = useState({ indicators: [], budget: [] });
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // AI Assessment States
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
        setDetails({ indicators: ind || [], budget: bud || [] });
        setComment(selectedProposal.reviewer_comments || '');
        
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
      feedback.push("Objective is too brief or missing for a formal GAD plan."); 
    }
    if (indicators.length === 0) { 
      score -= 30; 
      feedback.push("CRITICAL: Missing Success Indicators."); 
    }
    const issueWords = proposal.gender_issue?.toLowerCase().split(' ') || [];
    const objWords = proposal.gad_objective?.toLowerCase().split(' ') || [];
    const intersection = issueWords.filter(word => word.length > 4 && objWords.includes(word));
    if (intersection.length === 0) { 
      score -= 15; 
      feedback.push("Low Alignment: Objective words don't match the Issue."); 
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

  // UPDATED: Added error handling and verification select
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedProposal) return;
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase
        .from('gad_proposals')
        .update({ 
          status: newStatus, 
          reviewer_comments: comment,
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedProposal.id)
        .select(); // Verify the update worked

      if (error) throw error;

      if (data && data.length > 0) {
        alert(`Success! PPA is now marked as ${newStatus}`);
        setSelectedProposal(null);
        fetchAllProposals();
      } else {
        alert("Update failed: No rows were changed. This usually means you don't have permission to edit this record.");
      }
    } catch (err) {
      console.error("Status Update Error:", err.message);
      alert("Database Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = proposals.filter(p => 
    p.office_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.gad_activity?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase text-indigo-900">Loading Submissions...</div>;

  return (
    <div className="p-8 md:p-12 space-y-8 animate-in fade-in duration-500">
      {selectedProposal ? (
        <div className="space-y-8 animate-in zoom-in-95 duration-300 pb-20">
          <div className="flex justify-between items-center">
            <button onClick={() => setSelectedProposal(null)} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all">
              <ArrowLeft size={16}/> Back to List
            </button>
            <div className="flex gap-4">
               <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-xs uppercase ${aiScore > 70 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                <BrainCircuit size={16} /> AI Logic Score: {aiScore}%
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-xl space-y-10">
                <div className="border-b pb-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black text-indigo-950 tracking-tighter leading-tight">{selectedProposal.gad_activity}</h2>
                    <p className="font-bold text-indigo-600 uppercase text-xs mt-2 tracking-widest flex items-center gap-2">
                       <Building2 size={14}/> {selectedProposal.office_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Submission Status</p>
                    <span className="bg-indigo-50 text-indigo-700 px-4 py-1 rounded-full text-[10px] font-black uppercase border border-indigo-100">{selectedProposal.status}</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target size={14}/> Gender Issue</h4>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{selectedProposal.gender_issue}</p>
                    </div>
                    <div className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-50 space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Zap size={14}/> GAD Objective</h4>
                        <p className="text-sm font-bold text-indigo-900 leading-relaxed italic">"{selectedProposal.gad_objective || "No Objective Provided"}"</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2"><List size={16} className="text-indigo-400"/> Success Indicators</h4>
                        <div className="space-y-3">
                            {details.indicators.map((ind, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <span className="text-sm font-semibold text-slate-600">{ind.indicator_text}</span>
                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg uppercase">{ind.target_text}</span>
                            </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2"><Calculator size={16} className="text-indigo-400"/> Detailed Budget</h4>
                        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b">
                                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-5 py-3">Expense</th>
                                        <th className="px-5 py-3">Fund</th>
                                        <th className="px-5 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {details.budget.map((item, i) => (
                                    <tr key={i} className="border-b border-slate-50 last:border-0">
                                        <td className="px-5 py-3 font-medium text-slate-600">{item.item_description}</td>
                                        <td className="px-5 py-3 text-[10px] font-black text-indigo-500">{item.fund_type}</td>
                                        <td className="px-5 py-3 text-right font-mono font-bold">₱{item.amount.toLocaleString()}</td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="bg-indigo-900 text-white p-6 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest">Total GAD Request</span>
                                <span className="text-2xl font-mono font-black">₱{(selectedProposal.total_mooe + selectedProposal.total_ps + selectedProposal.total_co).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
              </div>

              <div className="bg-white border-2 border-indigo-50 rounded-[3rem] p-10 shadow-xl space-y-6">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-sm uppercase tracking-tighter mb-4">
                    <MessageSquare size={18} className="text-indigo-400"/> Reviewer Assessment & Comments
                </div>
                <div className="p-6 bg-indigo-50/50 rounded-2xl border-2 border-indigo-100">
                   <textarea 
                    className="w-full p-4 rounded-xl border-none outline-none focus:ring-2 ring-indigo-500 bg-white min-h-[120px] font-medium"
                    placeholder="Enter your professional assessment here..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    disabled={isProcessing}
                    onClick={() => handleUpdateStatus('Approved')} 
                    className="bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-100 disabled:bg-slate-300"
                  >
                    <CheckCircle size={24}/> APPROVE PPA
                  </button>
                  <button 
                    disabled={isProcessing}
                    onClick={() => handleUpdateStatus('For Revision')} 
                    className="bg-amber-500 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-100 disabled:bg-slate-300"
                  >
                    <AlertCircle size={24}/> REQUIRE REVISION
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-[#1e1b4b] text-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 sticky top-8">
                <div className="flex items-center gap-3 border-b border-indigo-800 pb-4">
                  <Zap className="text-amber-400 fill-amber-400" size={24} />
                  <h3 className="font-black uppercase tracking-widest text-xs">AI Smart Auditor</h3>
                </div>
                
                <div className="space-y-6 text-center">
                    <div>
                        <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">Compliance Score</p>
                        <div className="text-5xl font-black text-amber-400">{aiScore}%</div>
                    </div>

                    <div className="space-y-4 text-left">
                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert size={14}/> Critical Observations
                        </p>
                        {aiFeedback.length === 0 ? (
                            <p className="text-xs text-emerald-400 font-bold bg-emerald-400/10 p-4 rounded-xl">Alignment check passed.</p>
                        ) : (
                            <div className="space-y-2">
                                {aiFeedback.map((fb, i) => (
                                    <div key={i} className="text-[11px] text-indigo-100 bg-white/5 p-3 rounded-xl border border-white/10 leading-relaxed font-medium italic">
                                        • {fb}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => setComment(prev => prev + " AI Suggestion: " + aiFeedback.join(' '))}
                        className="w-full py-3 bg-indigo-500/20 border border-indigo-400 text-indigo-200 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-500/40 transition-all"
                    >
                        Sync AI Findings to Comments
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-4xl font-black text-indigo-950 uppercase tracking-tighter">Review Console</h2>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Master Submission List</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" placeholder="Search by office..."
                  className="pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 text-sm font-semibold w-72 shadow-sm"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={fetchAllProposals}
                className="p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>
          <div className="grid gap-6">
            {filtered.map(item => (
              <div key={item.id} onClick={() => setSelectedProposal(item)} className="group bg-white border-2 border-slate-50 p-8 rounded-[2.5rem] cursor-pointer hover:border-indigo-400 transition-all hover:shadow-2xl flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="bg-slate-50 p-5 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all text-slate-400">
                    <Building2 size={28}/>
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-indigo-950 uppercase leading-tight group-hover:text-indigo-600 transition-colors">{item.gad_activity}</h4>
                    <p className="text-[10px] font-black text-indigo-500 mt-1 uppercase tracking-widest">{item.office_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                    <span className={`text-[9px] font-black px-4 py-1.5 rounded-full border uppercase ${item.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{item.status}</span>
                    <Eye size={24} className="text-slate-200 group-hover:text-indigo-500 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}