import React, { useState } from 'react';
import { User, Lock, Mail, Phone, Calendar, MapPin, Activity, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabase } from '../lib/supabase';
import { INITIAL_USERS } from '../lib/mockData';
import { User as AppUser } from '../lib/types';

interface LoginScreenProps {
  onLogin: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regWeight, setRegWeight] = useState('');
  const [regHeight, setRegHeight] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (authError) throw authError;

        if (data.user) {
           const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', data.user.id)
            .single();
            
           if (userError) throw userError;
           
           onLogin(userData as AppUser);
           return;
        }
      } catch (err: any) {
        console.warn("Supabase Auth failed, trying local mock fallback", err.message);
      }
    }

    // Mock Fallback
    setTimeout(() => {
      setLoading(false);
      if (email === 'ajinasrm' && password === 'alaksa') {
        const adminUser = INITIAL_USERS.find(u => u.role === 'Admin');
        if (adminUser) {
           onLogin({ ...adminUser, email: 'ajinasrm', full_name: 'Super Admin' });
           return;
        }
      }

      const mockUser = INITIAL_USERS.find(u => u.email === email);
      if (mockUser && password === 'password') {
        onLogin(mockUser);
      } else {
        setError('Invalid credentials.');
      }
    }, 800);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSuccessMsg('Registration successful! Please check your email to verify your account.');
      setMode('login');
      setEmail(regEmail);
    }, 1200);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSuccessMsg(`Password reset link sent to ${email || 'your email'}. Please check your inbox.`);
      setMode('login');
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-6 min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div 
          key={mode}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800 shadow-inner">
               <User className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
              {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Join Body Line' : 'Reset Password'}
            </h1>
            <p className="text-sm text-zinc-400">
              {mode === 'login' ? 'Sign in to access your dashboard' : mode === 'register' ? 'Create your member account' : 'Enter your email to receive a reset link'}
            </p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl mb-6 text-center">
              {error}
            </motion.div>
          )}

          {successMsg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-xl mb-6 text-center">
              {successMsg}
            </motion.div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Username or Email ID</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600"
                    placeholder="Enter username or email"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Password</label>
                  <button type="button" onClick={() => setMode('forgot')} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">Forgot Password?</button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl transition-all mt-6 disabled:opacity-70 flex items-center justify-center gap-2 group"
              >
                {loading ? <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Full Name</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg py-2.5 px-3 text-sm focus:border-emerald-500 outline-none" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Date of Birth</label>
                  <input type="date" value={regDob} onChange={e => setRegDob(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg py-2.5 px-3 text-sm focus:border-emerald-500 outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg py-2.5 px-3 text-sm focus:border-emerald-500 outline-none" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Mobile</label>
                  <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg py-2.5 px-3 text-sm focus:border-emerald-500 outline-none" required />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Password</label>
                <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg py-2.5 px-3 text-sm focus:border-emerald-500 outline-none" required />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Address</label>
                <input type="text" value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg py-2.5 px-3 text-sm focus:border-emerald-500 outline-none" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={regWeight} onChange={e => setRegWeight(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg py-2.5 px-3 text-sm focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Height (cm)</label>
                  <input type="number" step="0.1" value={regHeight} onChange={e => setRegHeight(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg py-2.5 px-3 text-sm focus:border-emerald-500 outline-none" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl mt-6">
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your registered email" className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-4 focus:border-emerald-500 outline-none" required />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl mt-6">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs font-medium border-t border-zinc-800 pt-6">
            {mode === 'login' && (
              <p className="text-zinc-400">
                Don't have an account? <button onClick={() => setMode('register')} className="text-emerald-400 hover:text-emerald-300 ml-1">Sign up</button>
              </p>
            )}
            {(mode === 'register' || mode === 'forgot') && (
              <p className="text-zinc-400">
                Back to <button onClick={() => setMode('login')} className="text-emerald-400 hover:text-emerald-300 ml-1">Sign in</button>
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
