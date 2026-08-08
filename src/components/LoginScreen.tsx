import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getSupabase,
  isSupabaseConfigured,
  normaliseIdentifier,
  LOGIN_DOMAIN,
} from '../lib/supabase';
import { fetchProfile, describeDbError } from '../lib/db';
import { INITIAL_USERS } from '../lib/mockData';
import { User as AppUser } from '../lib/types';

interface LoginScreenProps {
  onLogin: (user: AppUser) => void;
  /** Demo mode is only offered when Supabase is not configured at all. */
  allowDemo?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, allowDemo = false }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const configured = isSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const supabase = getSupabase();

    // Demo mode: only when there is no backend to talk to at all.
    if (!supabase) {
      const mockUser = INITIAL_USERS.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      );
      setLoading(false);
      if (mockUser && password === 'password') {
        onLogin(mockUser);
      } else {
        setError(
          'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or use a demo account below.',
        );
      }
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normaliseIdentifier(email),
        password,
      });

      if (authError) {
        // Surface the real reason instead of silently falling back to mocks.
        setError(
          authError.message === 'Invalid login credentials'
            ? 'Incorrect username or password.'
            : authError.message,
        );
        return;
      }

      if (!data.user) {
        setError('Sign-in returned no user. Please try again.');
        return;
      }

      const profile = await fetchProfile(data.user.id);
      if (!profile) {
        setError(
          'Signed in, but no gym profile exists for this account. Run supabase_schema.sql, which creates the profile automatically.',
        );
        await supabase.auth.signOut();
        return;
      }

      onLogin(profile);
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      setError('Cannot register: Supabase is not configured.');
      return;
    }

    if (regPassword.length < 6) {
      setLoading(false);
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      // The on_auth_user_created trigger in supabase_schema.sql reads this
      // metadata and creates the matching public.users profile row.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normaliseIdentifier(regEmail),
        password: regPassword,
        options: {
          data: {
            full_name: regName,
            phone: regPhone,
            address: regAddress,
            date_of_birth: regDob || null,
            weight: regWeight || null,
            height: regHeight || null,
            role: 'Member',
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        setSuccessMsg('Account created. Signing you in...');
        const profile = data.user ? await fetchProfile(data.user.id) : null;
        if (profile) {
          onLogin(profile);
          return;
        }
      }

      setSuccessMsg(
        'Account created. Check your email to confirm the address, then sign in.',
      );
      setMode('login');
      setEmail(regEmail);
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      setError('Cannot send a reset link: Supabase is not configured.');
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normaliseIdentifier(email),
        { redirectTo: `${window.location.origin}/` },
      );
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSuccessMsg(
        'If that account exists, a reset link has been sent. Check your inbox and spam folder.',
      );
      setMode('login');
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg py-2.5 px-3 text-sm focus:border-emerald-500 focus:outline-none';

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
              {mode === 'login'
                ? 'Sign in to access your dashboard'
                : mode === 'register'
                ? 'Create your member account'
                : 'Enter your email to receive a reset link'}
            </p>
          </div>

          {!configured && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-3 rounded-xl mb-6 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Running in demo mode — no database connected. Add
                <code className="mx-1 text-amber-200">VITE_SUPABASE_URL</code>and
                <code className="mx-1 text-amber-200">VITE_SUPABASE_ANON_KEY</code>
                in Vercel, then redeploy.
              </span>
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl mb-6 text-center"
            >
              {error}
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-xl mb-6 text-center"
            >
              {successMsg}
            </motion.div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
                  Username or Email ID
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600"
                    placeholder="Enter username or email"
                    required
                  />
                </div>
                {configured && (
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    A username without “@” is treated as{' '}
                    <span className="text-zinc-400">username@{LOGIN_DOMAIN}</span>
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl transition-all mt-6 disabled:opacity-70 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {allowDemo && !configured && (
                <button
                  type="button"
                  onClick={() => {
                    const admin = INITIAL_USERS.find((u) => u.role === 'Admin');
                    if (admin) onLogin(admin);
                  }}
                  className="w-full border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Explore demo data (no database)
                </button>
              )}
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Full Name</label>
                  <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className={inputCls} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Date of Birth</label>
                  <input type="date" value={regDob} onChange={(e) => setRegDob(e.target.value)} className={inputCls} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Email</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputCls} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Mobile</label>
                  <input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className={inputCls} required />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className={inputCls}
                  required
                />
                <p className="text-[11px] text-zinc-500 mt-1">Minimum 6 characters.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Address</label>
                <input type="text" value={regAddress} onChange={(e) => setRegAddress(e.target.value)} className={inputCls} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={regWeight} onChange={(e) => setRegWeight(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Height (cm)</label>
                  <input type="number" step="0.1" value={regHeight} onChange={(e) => setRegHeight(e.target.value)} className={inputCls} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl mt-6 disabled:opacity-70"
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Email Address</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-4 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl mt-6 disabled:opacity-70"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs font-medium border-t border-zinc-800 pt-6">
            {mode === 'login' && (
              <p className="text-zinc-400">
                Don't have an account?
                <button
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 ml-1"
                >
                  Sign up
                </button>
              </p>
            )}
            {(mode === 'register' || mode === 'forgot') && (
              <p className="text-zinc-400">
                Back to
                <button
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 ml-1"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
