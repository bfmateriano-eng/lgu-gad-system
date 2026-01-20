import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, Trash2, Save, Target, Award, ArrowLeft, Send, 
  Database, FileText, BarChart3, Layers, AlertTriangle, MessageCircle 
} from 'lucide-react';

export default function EntryForm({ session, officeName, onCancel, initialData }) {
  // Split state for the structured Gender Issue
  const [genderIssueDetails, setGenderIssueDetails] = useState({
    statement: '',
    data_evidence: '',
    source: ''
  });

  const [formData, setFormData] = useState({
    focus_type: initialData?.focus_type || 'CLIENT-FOCUSED',
    ppa_category: initialData?.ppa_category || 'Client-Focused', 
    category_type: initialData?.category_type || 'GAD Mandated Program',
    gad_objective: initialData?.gad_objective || '',
    relevant_program: initialData?.relevant_program || '',
    gad_activity: initialData?.gad_activity || '',
  });

  const [indicators, setIndicators] = useState([{ indicator_text: '', target_text: '' }]);
  const [budgetItems, setBudgetItems] = useState([{ item_description: '', amount: 0, fund_type: 'MOOE' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OPTIMIZATION 1b: Pull Sectional Remarks from the reviewer
  const remarks = initialData?.sectional_comments || {};

  // Parse existing data if editing or re-rendering
  useEffect(() => {
    if (initialData?.gender_issue) {
      const parts = initialData.gender_issue.split('\n');
      setGenderIssueDetails({
        statement: parts[0]?.replace('Issue: ', '') || '',
        data_evidence: parts[1]?.replace('Data: ', '') || '',
        source: parts[2]?.replace('Source: ', '') || ''
      });
    }

    if (initialData?.id) {
      const fetchDetails = async () => {
        const { data: ind } = await supabase.from('ppa_indicators').select('*').eq('ppa_id', initialData.id);
        const { data: bud } = await supabase.from('ppa_budget_items').select('*').eq('ppa_id', initialData.id);
        if (ind && ind.length > 0) setIndicators(ind);
        if (bud && bud.length > 0) setBudgetItems(bud);
      };
      fetchDetails();
    }
  }, [initialData]);

  // Calculate totals for MOOE, PS, and CO
  const totals = budgetItems.reduce((acc, item) => {
    const val = parseFloat(item.amount) || 0;
    const type = item.fund_type.toLowerCase();
    if (acc.hasOwnProperty(type)) acc[type] += val;
    return acc;
  }, { mooe: 0, ps: 0, co: 0 });

  // OPTIMIZATION 1b: Remark Badge Helper
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

      // OPTIMIZATION 3: Add to History Tracer
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
    <div className="p-8 md:p-12 animate-in fade-in duration-300">
      <button onClick={onCancel} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* REVISION GUIDANCE HEADER */}
      {initialData?.status === 'For Revision' && (
        <div className="mb-10 bg-amber-600 text-white p-6 rounded-[2.5rem] flex items-center gap-6 shadow-xl animate-in slide-in-from-left duration-500">
            <MessageCircle size={32} className="text-amber-200" />
            <div>
                <h3 className="font-black uppercase tracking-widest text-sm">Action Required: Revisions Noted</h3>
                <p className="text-xs text-amber-50 font-medium">Please review the specific remarks highlighted in orange throughout the form before re-submitting.</p>
            </div>
        </div>
      )}

      <div className="space-y-12 pb-20">
        {/* SECTION 01: CLASSIFICATION */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-indigo-950 flex items-center gap-3 border-b pb-3 uppercase tracking-tighter">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">01</span>
            Classification
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PPA Category</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-indigo-500 text-indigo-600 appearance-none"
                value={formData.ppa_category} onChange={(e) => setFormData({...formData, ppa_category: e.target.value})}>
                <option value="Client-Focused">A. Client-Focused (External)</option>
                <option value="Agency-Focused">B. Agency-Focused (Internal)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Focus Type</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-semibold outline-none focus:border-indigo-500 appearance-none"
                value={formData.focus_type} onChange={(e) => setFormData({...formData, focus_type: e.target.value})}>
                <option value="CLIENT-FOCUSED">CLIENT-FOCUSED</option>
                <option value="ORGANIZATION-FOCUSED">ORGANIZATION-FOCUSED</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GAD Activity Name</label>
              <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-semibold outline-none focus:border-indigo-500"
                value={formData.gad_activity} onChange={(e) => setFormData({...formData, gad_activity: e.target.value})} />
              <RemarkBadge text={remarks.activities} />
            </div>
          </div>
        </section>

        {/* SECTION 02: STRUCTURED GENDER ISSUE */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-indigo-950 flex items-center gap-3 border-b pb-3 uppercase tracking-tighter">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">02</span>
            Gender Issue & Evidence
          </h2>
          
          <div className="grid gap-6 bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                <FileText size={14} className="text-indigo-500"/> Gender Issue / GAD Mandate
              </label>
              <input 
                placeholder="e.g. Lack of Livelihood Opportunity for OFW Families"
                className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 font-semibold outline-none focus:border-indigo-500"
                value={genderIssueDetails.statement} 
                onChange={(e) => setGenderIssueDetails({...genderIssueDetails, statement: e.target.value})} 
              />
              <RemarkBadge text={remarks.gender_issue} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
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
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GAD Result Statement / Objective</label>
            <textarea required className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 focus:border-indigo-500 outline-none font-medium resize-none min-h-[120px]"
              value={formData.gad_objective} onChange={(e) => setFormData({...formData, gad_objective: e.target.value})} />
            <RemarkBadge text={remarks.objectives} />
          </div>
        </section>

        {/* SECTION 03: INDICATORS */}
        <section className="space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-xl font-bold text-indigo-950 flex items-center gap-3 uppercase tracking-tighter">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">03</span>
              Indicators & Targets
            </h2>
            <button type="button" onClick={() => setIndicators([...indicators, { indicator_text: '', target_text: '' }])} 
              className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-indigo-100 uppercase transition-all shadow-sm active:scale-95">
              <Plus size={16} /> Add Indicator
            </button>
          </div>
          <div className="space-y-4">
            {indicators.map((ind, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-slate-50/50 p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="col-span-12 md:col-span-7 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-2"><Target size={12}/> Success Indicator</label>
                  <input required className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:border-indigo-500 shadow-sm"
                    value={ind.indicator_text} onChange={(e) => { const newI = [...indicators]; newI[idx].indicator_text = e.target.value; setIndicators(newI); }} />
                </div>
                <div className="col-span-12 md:col-span-4 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-2"><Award size={12}/> Target</label>
                  <input required className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none focus:border-indigo-500 shadow-sm"
                    value={ind.target_text} onChange={(e) => { const newI = [...indicators]; newI[idx].target_text = e.target.value; setIndicators(newI); }} />
                </div>
                <button type="button" onClick={() => setIndicators(indicators.filter((_, i) => i !== idx))} className="col-span-1 text-slate-300 hover:text-red-500 transition-colors pt-5 flex justify-end">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <RemarkBadge text={remarks.indicators} />
          </div>
        </section>

        {/* SECTION 04: BUDGET */}
        <section className="space-y-6 bg-slate-100 p-8 md:p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-200 pb-5">
            <h2 className="text-xl font-bold text-indigo-950 flex items-center gap-3 uppercase tracking-tighter">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-black">04</span>
              Budget Breakdown
            </h2>
            <button type="button" onClick={() => setBudgetItems([...budgetItems, { item_description: '', amount: 0, fund_type: 'MOOE' }])} 
              className="bg-indigo-600 text-white px-6 py-2 rounded-2xl text-[10px] font-black hover:bg-indigo-700 flex items-center gap-2 shadow-xl uppercase transition-all active:scale-95">
              <Plus size={16} /> Add Item
            </button>
          </div>
          <div className="space-y-3">
            {budgetItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-white p-5 rounded-[1.5rem] border shadow-sm transition-all hover:shadow-md">
                <div className="col-span-6">
                  <input className="w-full text-sm font-semibold outline-none" 
                    value={item.item_description} 
                    placeholder="Expense description (e.g. Training Honorarium)" 
                    onChange={(e) => { const n = [...budgetItems]; n[idx].item_description = e.target.value; setBudgetItems(n); }} />
                </div>
                <div className="col-span-2">
                  <select className="bg-slate-50 p-2 rounded-lg outline-none w-full text-[10px] font-black text-indigo-600 border border-slate-100 appearance-none text-center cursor-pointer" 
                    value={item.fund_type} 
                    onChange={(e) => { const n = [...budgetItems]; n[idx].fund_type = e.target.value; setBudgetItems(n); }}>
                    <option value="MOOE">MOOE</option>
                    <option value="PS">PS</option>
                    <option value="CO">CO</option>
                  </select>
                </div>
                <div className="col-span-3 text-right font-mono font-bold text-indigo-900 border-l pl-4">
                  ₱ <input type="number" className="w-24 text-right outline-none bg-transparent" 
                    value={item.amount} 
                    onChange={(e) => { const n = [...budgetItems]; n[idx].amount = e.target.value; setBudgetItems(n); }} />
                </div>
                <button type="button" onClick={() => setBudgetItems(budgetItems.filter((_, i) => i !== idx))} className="col-span-1 text-slate-200 hover:text-red-500 transition-colors flex justify-end">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <div className="pt-8 text-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl mt-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Total Estimated GAD Amount</p>
            <p className="text-4xl font-mono font-black text-indigo-900">₱ {(totals.mooe + totals.ps + totals.co).toLocaleString()}</p>
          </div>
          <RemarkBadge text={remarks.budget} />
        </section>

        {/* SUBMISSION ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 pb-20">
          <button type="button" disabled={isSubmitting} onClick={() => handleSave('Draft')} 
            className="w-full bg-white border-2 border-indigo-950 text-indigo-950 py-6 rounded-[2.5rem] font-black text-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
            <Save size={24} /> {initialData?.id ? 'UPDATE DRAFT' : 'SAVE AS DRAFT'}
          </button>
          <button type="button" disabled={isSubmitting} onClick={() => handleSave('Submitted')} 
            className="w-full bg-[#1e1b4b] text-white py-6 rounded-[2.5rem] font-black text-xl hover:bg-indigo-950 transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50">
            <Send size={24} /> {initialData?.id ? 'UPDATE & SUBMIT' : 'FINALIZE & SUBMIT'}
          </button>
        </div>
      </div>
    </div>
  );
}