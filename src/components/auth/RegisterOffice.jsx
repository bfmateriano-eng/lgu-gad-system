import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Building2, Mail, Lock, UserPlus, ArrowLeft, RefreshCw, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function RegisterOffice({ onLoginRedirect }) {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    officeName: '',
    role: 'User' 
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Sign up in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. USE UPDATE INSTEAD OF INSERT
        // The 500 error happens because a Database Trigger likely already 
        // created a blank profile row. We now fill it with the form data.
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            office_name: formData.officeName,
            role: formData.role,
            is_approved: false 
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        setIsSuccess(true);
      }
    } catch (err) {
      // Improved error message for debugging
      alert("Registration Error: " + (err.message || "Internal Server Error during profile sync"));
      console.error("Full Error Context:", err);
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center shadow-2xl animate-in zoom-in duration-300">
          <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-emerald-600" size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">Registration<br/>Submitted</h2>
          <p className="mt-4 text-slate-500 text-sm leading-relaxed">
            We've sent a confirmation link to <span className="font-bold text-indigo-600">{formData.email}</span>.
          </p>
          <div className="mt-6 p-5 bg-amber-50 rounded-2xl border border-amber-100 text-left">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Important Step:</p>
            <p className="text-[11px] text-amber-800 leading-tight">
              After confirming your email, the <strong>GAD Focal Person</strong> must manually approve your office account.
            </p>
          </div>
          <button 
            onClick={onLoginRedirect}
            className="mt-8 w-full bg-[#1e1b4b] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-900 transition-all shadow-lg active:scale-95"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <img src="/lgu-design.png" className="w-full h-full object-cover" alt="" />
      </div>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-white/20">
        <div className="bg-[#1e1b4b] p-10 text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16" />
           <Building2 className="text-indigo-400 mx-auto mb-4 relative z-10" size={48} />
           <h2 className="text-white text-2xl font-black uppercase tracking-tight relative z-10">Register Office</h2>
           <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-2 relative z-10">Creation of GAD Profile</p>
        </div>
        
        <form onSubmit={handleRegister} className="p-10 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Office Name</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" required placeholder="e.g. Accounting Office"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 transition-all font-bold text-sm"
                value={formData.officeName} 
                onChange={(e) => setFormData({...formData, officeName: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Role</label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 transition-all font-black text-sm appearance-none cursor-pointer"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="User">Department Office (Planner)</option>
                <option value="Admin">GAD Focal Point (Reviewer)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Office Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" required placeholder="dept@pililla.gov.ph"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 transition-all font-bold text-sm"
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Set Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" required placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 transition-all font-bold text-sm"
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            type="submit" 
            className="w-full bg-[#1e1b4b] text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-950 transition-all shadow-xl uppercase tracking-tighter flex items-center justify-center gap-3 disabled:bg-slate-300 active:scale-95"
          >
            {loading ? <RefreshCw className="animate-spin" /> : <UserPlus size={20} />}
            Create Profile
          </button>

          <div className="pt-2 text-center border-t border-slate-100 mt-4">
            <button 
              type="button"
              onClick={onLoginRedirect}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center gap-2 mx-auto mt-4"
            >
              <ArrowLeft size={14} /> Already Registered? Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}