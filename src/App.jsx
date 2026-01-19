import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Login from './components/auth/Login';
import RegisterOffice from './components/auth/RegisterOffice';
import WaitingRoom from './components/auth/WaitingRoom'; // Import the new waiting room
import GADForm from './components/gad-form/GADForm';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // 2. Listen for auth changes
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

  // 3. Helper to fetch Office Name, Role, and Approval Status
  async function fetchProfile(userId) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('office_name, role, is_approved')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Profile Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- LOADING SCREEN ---
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

  // --- MAIN NAVIGATION LOGIC ---
  // Step 1: No Session -> Show Login or Register
  if (!session) {
    return isRegistering ? (
      <RegisterOffice onLoginRedirect={() => setIsRegistering(false)} />
    ) : (
      <Login onRegisterRedirect={() => setIsRegistering(true)} />
    );
  }

  // Step 2: Session exists, but account is NOT approved (and not an Admin)
  if (profile && !profile.is_approved && profile.role !== 'Admin') {
    return <WaitingRoom />;
  }

  // Step 3: Session exists and account is Approved (or is Admin)
  return (
    <GADForm 
      session={session} 
      profile={profile} 
      onSignOut={() => supabase.auth.signOut()} 
    />
  );
}