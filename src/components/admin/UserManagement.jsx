import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  UserCheck, UserX, ShieldCheck, Clock, Building2, 
  ArrowLeft, Search, RefreshCw, Mail, ShieldAlert
} from 'lucide-react';

export default function UserManagement({ onBack }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      // Optimization: Fetch all profiles. 
      // The non-recursive RLS policy allows GAD_UNIT to see these records.
      // We order by is_approved ASC so that 'false' (pending) appears first.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('is_approved', { ascending: true }) 
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Fetch Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = async (profileId, currentStatus) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_approved: !currentStatus,
          approved_at: !currentStatus ? new Date().toISOString() : null 
        })
        .eq('id', profileId);

      if (error) throw error;
      
      // Update local state immediately for snappy UI
      setProfiles(profiles.map(p => 
        p.id === profileId ? { ...p, is_approved: !currentStatus } : p
      ));
      
      alert(`Office access ${!currentStatus ? 'granted' : 'revoked'} successfully.`);
    } catch (err) {
      alert("Update Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.office_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = profiles.filter(p => !p.is_approved).length;

  return (
    <div className="p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-colors mb-2">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-black text-indigo-950 tracking-tighter uppercase leading-none">
            User Management
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase mt-2">Approve and Manage Municipal Office Access</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-amber-100 text-amber-700 px-6 py-3 rounded-2xl flex items-center gap-3 border border-amber-200 shadow-sm shadow-amber-900/5">
            <Clock size={20} className={pendingCount > 0 ? "animate-pulse" : ""} />
            <div className="leading-none">
              <p className="text-[10px] font-black uppercase tracking-widest">Pending Approval</p>
              <p className="text-xl font-black">{pendingCount} Offices</p>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & ACTIONS */}
      <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by Office Name..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 outline-none font-bold transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={fetchProfiles} 
          disabled={loading}
          className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* PROFILES TABLE */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1e1b4b] text-white uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="p-6">Office Details</th>
                <th className="p-6 text-center">System Role</th>
                <th className="p-6 text-center">Access Status</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic animate-pulse">
                    Accessing Secure Profile Database...
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-20 text-center text-slate-400 font-bold uppercase text-xs">No offices found matching your search.</td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${profile.is_approved ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-500'}`}>
                          <Building2 size={24} />
                        </div>
                        <div>
                          <p className="font-black text-indigo-950 uppercase text-sm leading-none mb-1">{profile.office_name || 'Unnamed Office'}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 font-bold uppercase tracking-widest">
                            <Mail size={12}/> Joined {new Date(profile.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border-2 ${
                        profile.role === 'GAD_UNIT' || profile.role === 'LCE' || profile.role === 'Admin' 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        {profile.role?.replace('_', ' ') || 'USER'}
                      </span>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex justify-center">
                        {profile.is_approved ? (
                          <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                            <ShieldCheck size={16} /> Authorized
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest">
                            <ShieldAlert size={16} className="animate-pulse" /> Restricted
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <button 
                        onClick={() => toggleApproval(profile.id, profile.is_approved)}
                        disabled={isProcessing}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                          profile.is_approved 
                          ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-950 shadow-lg shadow-indigo-100'
                        }`}
                      >
                        {profile.is_approved ? 'Revoke Access' : 'Approve Office'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}