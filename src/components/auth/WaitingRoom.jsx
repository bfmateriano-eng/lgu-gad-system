import React from 'react';
import { Clock, ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function WaitingRoom() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center shadow-2xl">
        <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="text-amber-600" size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Account Pending</h2>
        <p className="mt-4 text-slate-500 text-sm leading-relaxed">
          Your email is verified, but your office account requires 
          <strong> Administrative Approval</strong> by the GAD Focal Person before you can access the portal.
        </p>
        
        <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 text-left">
          <ShieldAlert className="text-indigo-500 shrink-0" size={18} />
          <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight">
            Please contact the GAD Unit if your request has not been processed within 24 hours.
          </p>
        </div>

        <button 
          onClick={() => supabase.auth.signOut()}
          className="mt-8 flex items-center gap-2 mx-auto text-xs font-black text-red-500 uppercase tracking-widest hover:text-red-700 transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}