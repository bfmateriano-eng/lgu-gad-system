import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  LogOut, 
  LayoutDashboard, 
  FilePlus, 
  ShieldCheck, 
  CheckCircle, 
  BarChart3, 
  Landmark,
  Users, // Added for User Management
  RefreshCw
} from 'lucide-react';
import Dashboard from './Dashboard';
import EntryForm from './EntryForm';
import ReviewerDashboard from './ReviewerDashboard';
import ApprovedTable from './ApprovedTable';
import GADAnalytics from './GADAnalytics';
import LCEView from './LCEView';
import UserManagement from '../admin/UserManagement'; // Ensure this path is correct

export default function GADForm({ session, profile }) {
  const [view, setView] = useState('dashboard');
  const [officeName, setOfficeName] = useState('Loading...');
  const [role, setRole] = useState('User'); 
  const [editingProposal, setEditingProposal] = useState(null);

  // FETCH PROFILE (Automated via App.jsx prop or local fetch as fallback)
  useEffect(() => {
    if (profile) {
      setOfficeName(profile.office_name);
      setRole(profile.role);
    } else {
      async function getProfile() {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('office_name, role')
            .eq('id', session.user.id)
            .single();

          if (error) throw error;
          if (data) {
            setOfficeName(data.office_name);
            setRole(data.role);
          }
        } catch (err) {
          console.error('Error fetching profile:', err.message);
          setOfficeName('Unassigned Office');
        }
      }
      if (session?.user?.id) getProfile();
    }
  }, [session, profile]);

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

  // --- VIEW A: LOCAL CHIEF EXECUTIVE (MAYOR / LCE) PORTAL ---
  if (role === 'MAYOR' || role === 'LCE' || role === 'Admin' && view === 'lce_view') {
    return (
      <div className="min-h-screen bg-slate-50 py-6 px-4 font-sans text-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="bg-indigo-950 rounded-t-[2rem] px-10 py-4 flex justify-between items-center text-white shadow-xl">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 mr-4">
                <Landmark className="text-amber-400" size={24} />
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">Executive Oversight</span>
              </div>
              <button onClick={() => setView('dashboard')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'dashboard' ? 'text-amber-400' : 'text-white/60'}`}>Briefing</button>
              <button onClick={() => setView('approved_list')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'approved_list' ? 'text-amber-400' : 'text-white/60'}`}>Registry</button>
            </div>
            <button onClick={handleLogout} className="text-[10px] font-black text-white/60 hover:text-white uppercase tracking-widest transition-colors">
              <LogOut size={14} className="inline mr-2" /> Log Out
            </button>
          </div>
          <div className="bg-white rounded-b-[2rem] shadow-2xl overflow-hidden min-h-[80vh]">
            {view === 'dashboard' && <LCEView onNavigate={(target) => setView(target)} />}
            {view === 'approved_list' && <ApprovedTable onBack={() => setView('dashboard')} />}
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW B: GAD UNIT REVIEWER CONSOLE (Now includes User Management) ---
  if (role === 'GAD_UNIT' || role === 'Admin') {
    return (
      <div className="min-h-screen bg-slate-100 py-6 px-4 font-sans text-slate-900">
        <div className="max-w-6xl mx-auto shadow-2xl rounded-[3rem] overflow-hidden border border-slate-200 bg-white flex flex-col">
          
          <div className="bg-[#1e1b4b] border-b border-indigo-900 px-10 py-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 mr-2">
                <ShieldCheck className="text-emerald-400" size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Review Console</span>
              </div>
              
              <button onClick={() => setView('dashboard')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'}`}>Auditor</button>
              <button onClick={() => setView('approved_list')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'approved_list' ? 'text-emerald-400' : 'text-slate-400'}`}>Registry</button>
              <button onClick={() => setView('analytics')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'analytics' ? 'text-emerald-400' : 'text-slate-400'}`}>Analytics</button>
              
              {/* ADMIN ONLY: USER MANAGEMENT TAB */}
              <button 
                onClick={() => setView('users')} 
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${view === 'users' ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
              >
                <Users size={14} /> Accounts
              </button>
            </div>

            <button onClick={handleLogout} className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest transition-colors">
              <LogOut size={14} className="inline mr-2" /> Log Out
            </button>
          </div>

          <div className="flex-grow min-h-[600px]">
            {view === 'approved_list' && <ApprovedTable onBack={() => setView('dashboard')} />}
            {view === 'analytics' && <GADAnalytics onBack={() => setView('dashboard')} />}
            {view === 'users' && <UserManagement onBack={() => setView('dashboard')} />}
            
            {view === 'dashboard' && (
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  <div onClick={() => setView('approved_list')} className="bg-emerald-500 p-8 rounded-[2.5rem] shadow-xl cursor-pointer hover:scale-105 transition-all text-white">
                    <CheckCircle size={24} className="mb-4" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">Approved Registry</h3>
                    <p className="text-emerald-100 text-[9px] font-bold uppercase mt-1">Certified GAD PPAs</p>
                  </div>

                  <div onClick={() => setView('users')} className="bg-amber-500 p-8 rounded-[2.5rem] shadow-xl cursor-pointer hover:scale-105 transition-all text-white">
                    <Users size={24} className="mb-4" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">Office Access</h3>
                    <p className="text-amber-100 text-[9px] font-bold uppercase mt-1">Manage Account Approvals</p>
                  </div>

                  <div onClick={() => setView('analytics')} className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl cursor-pointer hover:scale-105 transition-all text-white">
                    <BarChart3 size={24} className="mb-4" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">Analytics</h3>
                    <p className="text-indigo-100 text-[9px] font-bold uppercase mt-1">Compliance Reports</p>
                  </div>
                </div>
                <ReviewerDashboard session={session} />
              </div>
            )}
          </div>

          <div className="h-20 relative bg-slate-50 border-t border-slate-100 flex items-center justify-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">Official GAD Review System • Pililla</p>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW C: STANDARD OFFICE PORTAL ---
  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto shadow-2xl rounded-[3rem] overflow-hidden border border-slate-200 bg-white flex flex-col">
        
        <div className="bg-slate-50 border-b border-slate-200 px-10 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <button onClick={() => setView('dashboard')} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${view === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <LayoutDashboard size={16} /> My Dashboard
            </button>
            <button onClick={handleNew} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${view === 'entry' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <FilePlus size={16} /> New Entry
            </button>
          </div>
          <button onClick={handleLogout} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors">
            <LogOut size={14} className="inline mr-1" /> Log Out
          </button>
        </div>

        <div className="bg-[#1e1b4b] text-white p-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <img src="/lgu-logo.png" className="h-20 w-20 drop-shadow-2xl" alt="Logo" />
              <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">GAD Planning</h1>
                <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 border-l-4 border-indigo-500 pl-3">
                  {officeName}
                </p>
              </div>
            </div>
            <img src="/better-pililla.png" className="h-12 brightness-0 invert opacity-50" alt="Branding" />
          </div>
        </div>

        <div className="flex-grow">
          {view === 'dashboard' ? (
            <Dashboard session={session} onAddNew={handleNew} onEdit={handleEdit} />
          ) : (
            <EntryForm session={session} officeName={officeName} initialData={editingProposal} onCancel={() => setView('dashboard')} />
          )}
        </div>

        <div className="h-24 relative overflow-hidden border-t border-slate-100 flex items-center justify-center">
          <img src="/lgu-design.png" className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" alt="" />
          <p className="text-[10px] font-black text-slate-400 bg-white/80 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200 uppercase tracking-[0.4em] relative z-10">Official System • Pililla</p>
        </div>
      </div>
    </div>
  );
}