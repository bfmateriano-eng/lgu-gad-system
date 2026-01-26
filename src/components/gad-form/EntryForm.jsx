import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, Trash2, Save, Target, Award, ArrowLeft, Send, 
  Database, FileText, BarChart3, Layers, AlertTriangle, MessageCircle, Landmark,
  GitMerge, ShieldCheck
} from 'lucide-react';

export default function EntryForm({ session, officeName, onCancel, initialData }) {
  // 1. Structured State for Gender Issue
  const [genderIssueDetails, setGenderIssueDetails] = useState({
    statement: '',
    data_evidence: '',
    source: ''
  });

  // 2. Core Form Data (Includes restored Category Type)
  const [formData, setFormData] = useState({
    focus_type: initialData?.focus_type || 'CLIENT-FOCUSED',
    ppa_category: initialData?.ppa_category || 'Client-Focused', 
    category_type: initialData?.category_type || 'Gender Issue', // Selection Field
    gad_objective: initialData?.gad_objective || '',
    relevant_program: initialData?.relevant_program || '', 
    gad_activity: initialData?.gad_activity || '',
  });

  const [indicators, setIndicators] = useState([{ indicator_text: '', target_text: '' }]);
  const [budgetItems, setBudgetItems] = useState([{ item_description: '', amount: 0, fund_type: 'MOOE' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pull Sectional Remarks from the reviewer
  const remarks = initialData?.sectional_comments || {};

  // 3. Effect to Parse and Map Initial Data
  useEffect(() => {
    if (initialData) {
      if (initialData.gender_issue) {
        const parts = initialData.gender_issue.split('\n');
        setGenderIssueDetails({
          statement: parts[0]?.replace('Issue: ', '') || '',
          data_evidence: parts[1]?.replace('Data: ', '') || '',
          source: parts[2]?.replace('Source: ', '') || ''
        });
      }

      setFormData({
        focus_type: initialData.focus_type || 'CLIENT-FOCUSED',
        ppa_category: initialData.ppa_category || 'Client-Focused', 
        category_type: initialData.category_type || 'Gender Issue',
        gad_objective: initialData.gad_objective || '',
        relevant_program: initialData.relevant_program || '',
        gad_activity: initialData.gad_activity || '',
      });

      const fetchDetails = async () => {
        const { data: ind } = await supabase.from('ppa_indicators').select('*').eq('ppa_id', initialData.id);
        const { data: bud } = await supabase.from('ppa_budget_items').select('*').eq('ppa_id', initialData.id);
        if (ind && ind.length > 0) setIndicators(ind);
        if (bud && bud.length > 0) setBudgetItems(bud);
      };
      
      if (initialData.id) fetchDetails();
    }
  }, [initialData]);

  // 4. Budget Calculation Logic
  const totals = budgetItems.reduce((acc, item) => {
    const val = parseFloat(item.amount) || 0;
    const type = item.fund_type.toLowerCase();
    if (acc.hasOwnProperty(type)) acc[type] += val;
    return acc;
  }, { mooe: 0, ps: 0, co: 0 });

  const totalGADBudget = totals.mooe + totals.ps + totals.co;

  const RemarkBadge = ({ text }) => {
    if (!text) return null;
    return (
      <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 p-3 rounded-xl animate-in slide-in-from-top-2 duration-300">
        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[10px] font-bold text-amber-800 leading-tight">
          REVISION NOTE: <span className="font-normal italic">{text}</span>
        </p>
      </div>
    );
  };

  const handleSave = async (statusType) => {
    if (!genderIssueDetails.statement || !formData.gad_activity) {
      alert("Please fill in the Gender Issue and GAD Activity.");
      return;
    }

    setIsSubmitting(true);
    const combinedGenderIssue = `Issue: ${genderIssueDetails.statement}\nData: ${genderIssueDetails.data_evidence}\nSource: ${genderIssueDetails.source}`;
    
    try {
      let ppaId = initialData?.id;
      
      const submissionData = { 
        ...formData, 
        gender_issue: combinedGenderIssue,
        office_name: officeName, 
        total_mooe: totals.mooe, 
        total_ps: totals.ps, 
        total_co: totals.co, 
        gad_budget: totalGADBudget,
        user_id: session.user.id,
        status: statusType 
      };
      
      if (ppaId) {
        const { error: updateError } = await supabase.from('gad_proposals').update(submissionData).eq('id', ppaId);
        if (updateError) throw updateError;
        await supabase.from('ppa_indicators').delete().eq('ppa_id', ppaId);
        await supabase.from('ppa_budget_items').delete().eq('ppa_id', ppaId);
      } else {
        const { data, error } = await supabase.from('gad_proposals').insert([submissionData]).select();
        if (error) throw error;
        ppaId = data[0].id;
      }
      
      await supabase.from('ppa_indicators').insert(indicators.map(ind => ({ ...ind, ppa_id: ppaId })));
      await supabase.from('ppa_budget_items').insert(budgetItems.map(item => ({ ...item, ppa_id: ppaId })));

      await supabase.from('ppa_history').insert([{
        ppa_id: ppaId,
        action_by: officeName,
        action_type: statusType,
        change_summary: `PPA record ${statusType === 'Submitted' ? 'submitted for verification' : 'saved as draft'}.`
      }]);
      
      onCancel(); 
    } catch (err) { 
      alert("Error saving: " + err.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="p-4 md:p-12 animate-in fade-in duration-300">
      <button onClick={onCancel} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* REVISION GUIDANCE HEADER */}
      {initialData?.status === 'For Revision' && (
        <div className="mb-10 bg-amber-600 text-white p-6 rounded-[2rem] flex items-center gap-6 shadow-xl animate-in slide-in-from-left duration-500">
            <MessageCircle size={32} className="text-amber-200" />
            <div>
                <h3 className="font-black uppercase tracking-widest text-sm">Action Required: Revisions Noted</h3>
                <p className="text-xs text-amber-50 font-medium leading-tight mt-1">Please review the specific remarks highlighted in orange before re-submitting.</p>
            </div>
        </div>
      )}

      {/* MOBILE-OPTIMIZED VERTICAL FORM CONTAINER */}
      <div className="max-w-3xl mx-auto space-y-12 pb-20">
        
        {/* SECTION 01: CLASSIFICATION */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-indigo-950 flex items-center gap-3 border-b pb-3 uppercase tracking-tighter">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">01</span>
            Classification
          </h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PPA Category</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-indigo-500 text-indigo-600 appearance-none"
                value={formData.ppa_category} onChange={(e) => setFormData({...formData, ppa_category: e.target.value})}>
                <option value="Client-Focused">A. Client-Focused (External)</option>
                <option value="Agency-Focused">B. Agency-Focused (Internal)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Focus Type</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-semibold outline-none focus:border-indigo-500 appearance-none"
                value={formData.focus_type} onChange={(e) => setFormData({...formData, focus_type: e.target.value})}>
                <option value="CLIENT-FOCUSED">CLIENT-FOCUSED</option>
                <option value="ORGANIZATION-FOCUSED">ORGANIZATION-FOCUSED</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GAD Activity Name</label>
              <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-semibold outline-none focus:border-indigo-500"
                value={formData.gad_activity} onChange={(e) => setFormData({...formData, gad_activity: e.target.value})} />
              <RemarkBadge text={remarks.activities} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Relevant LGU Program</label>
              <div className="relative">
                 <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                 <input 
                    placeholder="e.g. Social Welfare & Development Program"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 font-semibold outline-none focus:border-indigo-500"
                    value={formData.relevant_program} 
                    onChange={(e) => setFormData({...formData, relevant_program: e.target.value})} 
                 />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 02: GENDER ISSUE & EVIDENCE */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-indigo-950 flex items-center gap-3 border-b pb-3 uppercase tracking-tighter">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">02</span>
            Gender Issue & Evidence
          </h2>
          
          <div className="flex flex-col gap-6 bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-200">
            
            {/* CATEGORY TYPE SELECTION (Gender Issue or GAD Mandate) */}
            <div className="space-y-3 mb-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block text-center">Is this derived from a Gender Issue or GAD Mandate?</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-200/50 p-1.5 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, category_type: 'Gender Issue'})}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${formData.category_type === 'Gender Issue' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <GitMerge size={14} /> GENDER ISSUE
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, category_type: 'GAD Mandate'})}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${formData.category_type === 'GAD Mandate' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <ShieldCheck size={14} /> GAD MANDATE
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                <FileText size={14} className="text-indigo-500"/> {formData.category_type} Statement
              </label>
              <input 
                placeholder={`Enter the specific ${formData.category_type} statement`}
                className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 font-semibold outline-none focus:border-indigo-500"
                value={genderIssueDetails.statement} 
                onChange={(e) => setGenderIssueDetails({...genderIssueDetails, statement: e.target.value})} 
              />
              <RemarkBadge text={remarks.gender_issue} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                <BarChart3 size={14} className="text-emerald-500"/> Relevant Data / Evidence
              </label>
              <textarea 
                placeholder="e.g. 75% of 987 OFW Families reported no extra income"
                className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 font-semibold outline-none focus:border-indigo-500 min-h-[100px] resize-none"
                value={genderIssueDetails.data_evidence} 
                onChange={(e) => setGenderIssueDetails({...genderIssueDetails, data_evidence: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                <Database size={14} className="text-amber-500"/> Source of Data
              </label>
              <input 
                placeholder="e.g. CBMS 2024 / Survey Result"
                className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 font-semibold outline-none focus:border-indigo-500"
                value={genderIssueDetails.source} 
                onChange={(e) => setGenderIssueDetails({...genderIssueDetails, source: e.target.value})} 
              />
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GAD Result Objective</label>
              <textarea required className="w-full bg-white border-2 border-indigo-100 rounded-2xl p-6 focus:border-indigo-500 outline-none font-medium resize-none min-h-[120px]"
                value={formData.gad_objective} onChange={(e) => setFormData({...formData, gad_objective: e.target.value})} />
              <RemarkBadge text={remarks.objectives} />
            </div>
          </div>
        </section>

        {/* SECTION 03: INDICATORS */}
        <section className="space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-xl font-bold text-indigo-950 uppercase tracking-tighter">03. Indicators</h2>
            <button type="button" onClick={() => setIndicators([...indicators, { indicator_text: '', target_text: '' }])} 
              className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 uppercase transition-all shadow-sm active:scale-95">
              <Plus size={16} /> Add
            </button>
          </div>
          <div className="space-y-4">
            {indicators.map((ind, idx) => (
              <div key={idx} className="flex flex-col gap-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-200 relative shadow-sm">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Indicator</label>
                   <input required className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:border-indigo-500 shadow-inner"
                    value={ind.indicator_text} onChange={(e) => { const newI = [...indicators]; newI[idx].indicator_text = e.target.value; setIndicators(newI); }} />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Target</label>
                   <input required className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none focus:border-indigo-500 shadow-inner"
                    value={ind.target_text} onChange={(e) => { const newI = [...indicators]; newI[idx].target_text = e.target.value; setIndicators(newI); }} />
                </div>
                <button type="button" onClick={() => setIndicators(indicators.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <RemarkBadge text={remarks.indicators} />
          </div>
        </section>

        {/* SECTION 04: BUDGET */}
        <section className="space-y-6 bg-slate-100 p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-inner">
          <div className="flex justify-between items-center border-b border-slate-200 pb-5">
            <h2 className="text-xl font-bold text-indigo-950 uppercase tracking-tighter">04. Budget</h2>
            <button type="button" onClick={() => setBudgetItems([...budgetItems, { item_description: '', amount: 0, fund_type: 'MOOE' }])} 
              className="bg-indigo-600 text-white px-6 py-2 rounded-2xl text-[10px] font-black hover:bg-indigo-700 uppercase transition-all shadow-xl active:scale-95">
              <Plus size={16} /> Add
            </button>
          </div>
          <div className="space-y-4">
            {budgetItems.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-4 bg-white p-5 rounded-2xl border shadow-sm relative">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Expense Description</label>
                   <input className="w-full text-sm font-semibold outline-none" 
                    value={item.item_description} placeholder="e.g. Training Meals" 
                    onChange={(e) => { const n = [...budgetItems]; n[idx].item_description = e.target.value; setBudgetItems(n); }} />
                </div>
                <div className="flex gap-4">
                   <div className="flex-1 space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Fund Source</label>
                      <select className="w-full bg-slate-50 p-3 rounded-xl text-[10px] font-black text-indigo-600 appearance-none text-center cursor-pointer" 
                        value={item.fund_type} onChange={(e) => { const n = [...budgetItems]; n[idx].fund_type = e.target.value; setBudgetItems(n); }}>
                        <option value="MOOE">MOOE</option><option value="PS">PS</option><option value="CO">CO</option>
                      </select>
                   </div>
                   <div className="flex-1 space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1 text-right block tracking-widest">Amount (₱)</label>
                      <input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-right outline-none text-indigo-950 shadow-inner" 
                        value={item.amount} onChange={(e) => { const n = [...budgetItems]; n[idx].amount = e.target.value; setBudgetItems(n); }} />
                   </div>
                </div>
                <button type="button" onClick={() => setBudgetItems(budgetItems.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-200 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <div className="pt-8 text-center bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl mt-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Total Estimated GAD Amount</p>
            <p className="text-4xl font-mono font-black text-indigo-900">₱ {totalGADBudget.toLocaleString()}</p>
          </div>
          <RemarkBadge text={remarks.budget} />
        </section>

        {/* SUBMISSION ACTIONS */}
        <div className="flex flex-col gap-4 pt-6 pb-20">
          <button type="button" disabled={isSubmitting} onClick={() => handleSave('Submitted')} 
            className="w-full bg-[#1e1b4b] text-white py-6 rounded-2xl font-black text-xl hover:bg-indigo-950 transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50">
            <Send size={24} /> FINALIZE & SUBMIT
          </button>
          <button type="button" disabled={isSubmitting} onClick={() => handleSave('Draft')} 
            className="w-full bg-white border-2 border-indigo-950 text-indigo-950 py-6 rounded-2xl font-black text-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
            <Save size={24} /> SAVE AS DRAFT
          </button>
        </div>
      </div>
    </div>
  );
}