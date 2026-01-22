import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import Login from './components/auth/Login';
import RegisterOffice from './components/auth/RegisterOffice';
import WaitingRoom from './components/auth/WaitingRoom';
import GADForm from './components/gad-form/GADForm'; 
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('office_name, role, is_approved')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Profile Fetch Error:", err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-indigo-300 font-black text-xs uppercase tracking-[0.3em]">
          Verifying Credentials...
        </p>
      </div>
    );
  }

  // --- AUTH ROUTING ---

  if (!session) {
    return isRegistering ? (
      <RegisterOffice onLoginRedirect={() => setIsRegistering(false)} />
    ) : (
      <Login onRegisterRedirect={() => setIsRegistering(true)} />
    );
  }

  // Handle RLS/Sync Errors
  if (session && !profile) {
     return (
       <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-center">
         <div className="max-w-md space-y-6">
           <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem]">
             <p className="text-white font-bold text-lg tracking-tight mb-2">Profile Sync Error</p>
             <p className="text-slate-400 text-sm">Account verified, but office data is unreachable. Ensure the SQL fix for recursion is applied.</p>
           </div>
           <button onClick={() => fetchProfile(session.user.id)} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs transition-all active:scale-95">
             Retry Sync
           </button>
           <button onClick={() => supabase.auth.signOut()} className="block w-full text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest">
             Sign Out
           </button>
         </div>
       </div>
     );
  }

  // Handle Approval Status
  const isAdminRole = ['GAD_UNIT', 'LCE', 'Admin'].includes(profile?.role);
  if (!profile.is_approved && !isAdminRole) {
    return <WaitingRoom onSignOut={() => supabase.auth.signOut()} />;
  }

  return <GADForm session={session} profile={profile} />;
}