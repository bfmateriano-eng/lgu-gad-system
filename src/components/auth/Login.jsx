import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { User, Lock, ArrowRight } from 'lucide-react';

export default function Login({ onRegisterRedirect }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <img src="/lgu-design.png" className="w-full h-full object-cover" alt="" />
      </div>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10">
        <div className="bg-[#1e1b4b] p-10 text-center">
           <img src="/lgu-logo.png" className="h-20 w-20 mx-auto mb-4 drop-shadow-xl" alt="LGU Logo" />
           <h2 className="text-white text-2xl font-black uppercase tracking-tight">LGU Pililla</h2>
           <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-2">GAD Planning Portal</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" required placeholder="user@pililla.gov.ph"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 transition-all font-medium text-sm"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" required placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 transition-all font-medium text-sm"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-[#1e1b4b] text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-800 transition-all shadow-xl uppercase tracking-tighter">
            {loading ? 'Entering System...' : 'Enter System'}
          </button>

          <div className="pt-2 text-center">
            <button 
              type="button"
              onClick={onRegisterRedirect}
              className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-2 mx-auto"
            >
              New Office? Register Profile <ArrowRight size={14} />
            </button>
          </div>
          
          <div className="pt-4 flex justify-center border-t border-slate-100">
            <img src="/better-pililla.png" className="h-8 opacity-40" alt="Branding" />
          </div>
        </form>
      </div>
    </div>
  );
}