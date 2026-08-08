import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  UserCheck, 
  QrCode, 
  Database, 
  Smartphone, 
  Monitor, 
  Wifi, 
  BatteryMedium, 
  ShieldCheck, 
  ChevronDown,
  AlertTriangle,
  X,
  Sparkles,
  CreditCard,
  Dumbbell
} from 'lucide-react';
import { Tenant, User } from '../lib/types';

interface AndroidFrameProps {
  currentTenant: Tenant;
  currentUser: User | null;
  onOpenQRScanner: () => void;
  onOpenAIWorkoutModal: () => void;
  isLiveSupabaseConnected: boolean;
  onLogout?: () => void;
  /** Surfaced as a dismissible banner so failures are visible, not silent. */
  dataError?: string;
  onDismissError?: () => void;
  children: React.ReactNode;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  currentTenant,
  currentUser,
  onOpenQRScanner,
  onOpenAIWorkoutModal,
  isLiveSupabaseConnected,
  onLogout,
  dataError,
  onDismissError,
  children
}) => {
  const [isMobileFrame, setIsMobileFrame] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* TOP CONTROL BAR - Multi-Tenant, Role Switcher & Dev Tools */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Brand & Gym Franchise Selector */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 font-bold text-lg">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm tracking-wide">GymSaaS Pro</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                  Android & Web
                </span>
              </div>
              
              {/* SINGLE GYM TITLE */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-xl border border-slate-700/50 mt-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-200 truncate max-w-[120px]">
                  {currentTenant.name}
                </span>
                <span
                  title={isLiveSupabaseConnected ? 'Connected to Supabase' : 'Demo data — no database connected'}
                  className={`ml-1 flex items-center gap-1 text-[10px] font-semibold ${
                    isLiveSupabaseConnected ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  {isLiveSupabaseConnected ? 'Live' : 'Demo'}
                </span>
              </div>
            </div>
          </div>

          {/* Role Display Pill Bar (Replaced Dev Switcher) */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 gap-2">
            <div className="px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white shadow-md shadow-indigo-600/30 flex items-center gap-2">
              {currentUser?.role === 'Admin' && <Building2 className="w-3.5 h-3.5" />}
              {currentUser?.role === 'Trainer' && <UserCheck className="w-3.5 h-3.5" />}
              {currentUser?.role === 'Member' && <CreditCard className="w-3.5 h-3.5" />}
              <span>{currentUser?.role || 'Guest'} Portal</span>
            </div>
            {onLogout && (
              <button 
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Logout
              </button>
            )}
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-2">
            {/* AI Generator Button */}
            <button
              onClick={onOpenAIWorkoutModal}
              className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">AI Workout Genius</span>
            </button>

            {/* QR Scanner */}
            <button
              onClick={onOpenQRScanner}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 border border-slate-700/60 transition-all"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">QR Gate Scan</span>
            </button>



            {/* View Mode Toggle: Android Frame vs Full Web */}
            <button
              onClick={() => setIsMobileFrame(!isMobileFrame)}
              title={isMobileFrame ? "Switch to Desktop View" : "Switch to Android Mobile View"}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
            >
              {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
        </div>
      </header>

      {dataError && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2.5 text-red-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{dataError}</span>
          {onDismissError && (
            <button onClick={onDismissError} className="p-0.5 hover:text-white" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* MAIN VIEW AREA */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        {isMobileFrame ? (
          /* ANDROID DEVICE CONTAINER FRAME */
          <div className="relative w-full max-w-[410px] h-[830px] max-h-[92vh] bg-slate-900 rounded-[48px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden ring-1 ring-slate-700/50">
            
            {/* Android Camera Punch Hole & Earpiece */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
              <div className="w-3.5 h-3.5 bg-black rounded-full ring-2 ring-slate-800/60"></div>
            </div>

            {/* Android System Status Bar */}
            <div className="bg-slate-950 text-slate-400 px-6 pt-3 pb-1.5 flex items-center justify-between text-[11px] font-medium tracking-tight select-none z-40">
              <span className="text-slate-200 font-semibold">{currentTime || '12:45'}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-semibold">5G</span>
                <Wifi className="w-3 h-3 text-slate-300" />
                <BatteryMedium className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>

            {/* Screen Content Wrapper */}
            <div className="flex-1 overflow-y-auto bg-slate-950 relative custom-scrollbar flex flex-col">
              {children}
            </div>

            {/* Android Bottom Navigation Bar / Gesture Pill */}
            <div className="bg-slate-950 py-2.5 flex justify-center items-center select-none z-40 border-t border-slate-900">
              <div className="w-32 h-1 bg-slate-600/80 rounded-full"></div>
            </div>
          </div>
        ) : (
          /* DESKTOP FULL WIDTH CONTAINER */
          <div className="w-full max-w-7xl mx-auto bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden min-h-[750px] flex flex-col backdrop-blur-sm">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};
