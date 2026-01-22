import React, { useEffect, useState, useRef } from 'react';
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
  
  // Optimization: Track the ID to prevent flickering on background refreshes
  const lastFetchedId = useRef(null);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (session) {
        // Only trigger loading state if it's a new user login
        if (lastFetchedId.current !== session.user.id) {
          fetchProfile(session.user.id);
        }
      } else {
        // Clear state on Sign Out
        setProfile(null);
        lastFetchedId.current = null;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    // Only show the full-screen spinner if we don't already have a profile
    if (!profile) setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('office_name, role, is_approved')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      
      setProfile(data);
      lastFetchedId.current = userId;
    } catch (err) {
      console.error("Profile Fetch Error:", err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  // OPTIMIZED: Centralized "Force Logout" to handle 403 Forbidden errors
  const handleSignOut = async () => {
    try {
      setLoading(true);
      // Attempt to tell the server we are logging out
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout request failed, forcing local cleanup:", err.message);
    } finally {
      // CRITICAL FIX: Always clear local state regardless of server response
      setSession(null);
      setProfile(null);
      lastFetchedId.current = null;
      
      // Clear any potentially corrupted auth data from browser storage
      localStorage.removeItem('supabase.auth.token'); 
      
      setLoading(false);
      
      // Force a soft reload to ensure the Supabase client is reset
      window.location.hash = ''; 
    }
  };

  // --- 1. FULL SCREEN LOADING (Initial Only) ---
  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-indigo-300 font-black text-xs uppercase tracking-[0.3em] animate-pulse">
          Verifying Credentials...
        </p>
      </div>
    );
  }

  // --- 2. AUTH ROUTING (Login/Register) ---
  if (!session) {
    return isRegistering ? (
      <RegisterOffice onLoginRedirect={() => setIsRegistering(false)} />
    ) : (
      <Login onRegisterRedirect={() => setIsRegistering(true)} />
    );
  }

  // --- 3. HANDLE SYNC ERRORS (Retry Logic) ---
  if (session && !profile && !loading) {
     return (
       <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-center">
         <div className="max-w-md space-y-6">
           <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem]">
             <p className="text-white font-bold text-lg tracking-tight mb-2">Profile Sync Error</p>
             <p className="text-slate-400 text-sm">Account verified, but office data is unreachable. This usually happens after a new registration.</p>
           </div>
           <button 
             onClick={() => fetchProfile(session.user.id)} 
             className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs transition-all active:scale-95 shadow-xl"
           >
             Retry Sync
           </button>
           <button 
             onClick={handleSignOut} 
             className="block w-full text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors mt-4"
           >
             Sign Out
           </button>
         </div>
       </div>
     );
  }

  // --- 4. APPROVAL GATE (Waiting Room) ---
  const isAdminRole = ['GAD_UNIT', 'LCE', 'Admin'].includes(profile?.role);
  if (profile && !profile.is_approved && !isAdminRole) {
    return <WaitingRoom onSignOut={handleSignOut} />;
  }

  // --- 5. MAIN SYSTEM ---
  return (
    <GADForm 
      session={session} 
      profile={profile} 
      onSignOut={handleSignOut} 
    />
  );
}