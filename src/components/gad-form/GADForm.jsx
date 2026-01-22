import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  LogOut, LayoutDashboard, FilePlus, ShieldCheck, 
  CheckCircle, BarChart3, Landmark, Users, RefreshCw 
} from 'lucide-react';
import Dashboard from './Dashboard';
import EntryForm from './EntryForm';
import ReviewerDashboard from './ReviewerDashboard';
import ApprovedTable from './ApprovedTable';
import GADAnalytics from './GADAnalytics';
import LCEView from './LCEView';
import UserManagement from '../admin/UserManagement';

export default function GADForm({ session, profile }) {
  const [view, setView] = useState('dashboard');
  const [editingProposal, setEditingProposal] = useState(null);

  // Use props from App.jsx - This kills the "Unassigned Office" bug
  const officeName = profile?.office_name || "LGU Office";
  const role = profile?.role || "User";

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleEdit = (proposal) => {
    setEditingProposal(proposal);
    setView('entry');
  };

  const handleNew = () => {
    setEditingProposal(null);
    setView('entry');
  };

  // --- VIEW A: MAYOR / LCE ---
  if (role === 'MAYOR' || role === 'LCE') {
    return (
      <div className="min-h-screen bg-slate-50 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-indigo-950 rounded-t-[2rem] px-10 py-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-6">
              <Landmark className="text-amber-400" size={24} />
              <button onClick={() => setView('dashboard')} className={`text-[10px] font-black uppercase ${view === 'dashboard' ? 'text-amber-400' : 'text-white/60'}`}>Briefing</button>
              <button onClick={() => setView('approved_list')} className={`text-[10px] font-black uppercase ${view === 'approved_list' ? 'text-amber-400' : 'text-white/60'}`}>Registry</button>
            </div>
            <button onClick={handleLogout} className="text-[10px] font-black text-white/60 hover:text-white uppercase"><LogOut size={14} className="inline mr-2" /> Log Out</button>
          </div>
          <div className="bg-white rounded-b-[2rem] shadow-2xl overflow-hidden min-h-[80vh]">
            {view === 'dashboard' && <LCEView onNavigate={(target) => setView(target)} />}
            {view === 'approved_list' && <ApprovedTable onBack={() => setView('dashboard')} />}
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW B: GAD UNIT ---
  if (role === 'GAD_UNIT' || role === 'Admin') {
    return (
      <div className="min-h-screen bg-slate-100 py-6 px-4">
        <div className="max-w-6xl mx-auto shadow-2xl rounded-[3rem] overflow-hidden border bg-white flex flex-col">
          <div className="bg-[#1e1b4b] px-10 py-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-6">
              <ShieldCheck className="text-emerald-400" size={20} />
              <button onClick={() => setView('dashboard')} className={`text-[10px] font-black uppercase ${view === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'}`}>Auditor</button>
              <button onClick={() => setView('approved_list')} className={`text-[10px] font-black uppercase ${view === 'approved_list' ? 'text-emerald-400' : 'text-slate-400'}`}>Registry</button>
              <button onClick={() => setView('analytics')} className={`text-[10px] font-black uppercase ${view === 'analytics' ? 'text-emerald-400' : 'text-slate-400'}`}>Analytics</button>
              <button onClick={() => setView('users')} className={`text-[10px] font-black uppercase ${view === 'users' ? 'text-amber-400' : 'text-slate-400'}`}>Accounts</button>
            </div>
            <button onClick={handleLogout} className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase"><LogOut size={14} className="inline mr-2" /> Log Out</button>
          </div>
          <div className="flex-grow min-h-[600px]">
            {view === 'approved_list' && <ApprovedTable onBack={() => setView('dashboard')} />}
            {view === 'analytics' && <GADAnalytics onBack={() => setView('dashboard')} />}
            {view === 'users' && <UserManagement onBack={() => setView('dashboard')} />}
            {view === 'dashboard' && (
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  <div onClick={() => setView('approved_list')} className="bg-emerald-500 p-8 rounded-[2.5rem] shadow-xl text-white cursor-pointer hover:scale-105 transition-all"><CheckCircle className="mb-4" /> <h3 className="font-black uppercase">Registry</h3></div>
                  <div onClick={() => setView('users')} className="bg-amber-500 p-8 rounded-[2.5rem] shadow-xl text-white cursor-pointer hover:scale-105 transition-all"><Users className="mb-4" /> <h3 className="font-black uppercase">Accounts</h3></div>
                  <div onClick={() => setView('analytics')} className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white cursor-pointer hover:scale-105 transition-all"><BarChart3 className="mb-4" /> <h3 className="font-black uppercase">Analytics</h3></div>
                </div>
                <ReviewerDashboard session={session} onSignOut={handleLogout} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW C: STANDARD OFFICE ---
  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-5xl mx-auto shadow-2xl rounded-[3rem] overflow-hidden border bg-white flex flex-col">
        <div className="bg-slate-50 border-b px-10 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <button onClick={() => setView('dashboard')} className={`flex items-center gap-2 text-[10px] font-black uppercase ${view === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}><LayoutDashboard size={16} /> My Dashboard</button>
            <button onClick={handleNew} className={`flex items-center gap-2 text-[10px] font-black uppercase ${view === 'entry' ? 'text-indigo-600' : 'text-slate-400'}`}><FilePlus size={16} /> New Entry</button>
          </div>
          <button onClick={handleLogout} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase">Log Out</button>
        </div>
        <div className="bg-[#1e1b4b] text-white p-10">
          <div className="flex items-center gap-6">
            <img src="/lgu-logo.png" className="h-20 w-20 drop-shadow-2xl" alt="Logo" />
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">GAD Planning</h1>
              <p className="text-indigo-400 font-bold uppercase text-[10px] mt-2 border-l-4 border-indigo-500 pl-3">{officeName}</p>
            </div>
          </div>
        </div>
        <div className="flex-grow">
          {view === 'dashboard' ? (
            <Dashboard session={session} onAddNew={handleNew} onEdit={handleEdit} />
          ) : (
            <EntryForm session={session} officeName={officeName} initialData={editingProposal} onCancel={() => setView('dashboard')} />
          )}
        </div>
      </div>
    </div>
  );
}