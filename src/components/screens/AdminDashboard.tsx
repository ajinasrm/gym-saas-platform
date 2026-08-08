import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  Activity, 
  Calendar, 
  QrCode, 
  TrendingUp,
  Search,
  Filter,
  MoreVertical,
  Plus,
  Mail,
  Smartphone,
  Shield,
  CreditCard,
  Building2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShoppingBag,
  Download,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Cake,
  Dumbbell,
  Edit2,
  Trash2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Tenant, User, Membership, AttendanceRecord, GymClass, PaymentRequest } from '../../lib/types';
import { PaymentApprovalsPanel } from '../PaymentApprovalsPanel';
import { REVENUE_STATS_DATA, INITIAL_CLASSES, INITIAL_TENANTS, INITIAL_PRODUCTS } from '../../lib/mockData';
import { getSupabase, getStoredSupabaseCredentials } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { deleteUser as dbDeleteUser, upsertMembership, describeDbError } from '../../lib/db';

interface AdminDashboardProps {
  tenant: Tenant;
  users: User[];
  memberships: Membership[];
  attendance: AttendanceRecord[];
  onOpenQRScanner: () => void;
  payments: PaymentRequest[];
  onApprovePayment: (paymentId: string, note: string) => Promise<void>;
  onRejectPayment: (paymentId: string, note: string) => Promise<void>;
  /** Re-reads everything from Supabase. */
  onRefresh: () => Promise<void> | void;
  isRefreshing: boolean;
  isLive: boolean;
}

const RENEWAL_PLANS = {
  '1 Month': { duration: 1, price: 899 },
  '3 Months': { duration: 3, price: 2499 },
  '6 Months': { duration: 6, price: 4799 },
  '9 Months': { duration: 9, price: 7199 },
  '12 Months': { duration: 12, price: 8999 }
} as const;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  tenant,
  users,
  memberships,
  attendance,
  onOpenQRScanner,
  payments,
  onApprovePayment,
  onRejectPayment,
  onRefresh,
  isRefreshing,
  isLive
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'members' | 'approvals' | 'classes' | 'pos'>('analytics');
  const currentTenant = tenant;   // always follow the prop; never fork it
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Expired' | 'DueRenewal'>('All');
  
  // Local state for dynamic updates
  const [localUsers, setLocalUsers] = useState<User[]>(users);
  
  // Sync when prop changes (like from Supabase fetch)
  useEffect(() => {
    setLocalUsers(users);
  }, [users]);
  
  // Add Member State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Member' | 'Trainer' | 'Admin'>('Member');
  const [newMemberDob, setNewMemberDob] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberPlan, setNewMemberPlan] = useState<keyof typeof RENEWAL_PLANS>('1 Month');
  
  // Edit/Renew Member State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [renewingUserId, setRenewingUserId] = useState<string | null>(null);
  const [renewingPlan, setRenewingPlan] = useState<keyof typeof RENEWAL_PLANS>('1 Month');
  
  // AI Insights State
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  
  const [actionError, setActionError] = useState('');

  const pendingPayments = payments.filter(p => p.status === 'PENDING').length;

  // Studio Class Management State
  const [gymClasses, setGymClasses] = useState<GymClass[]>(INITIAL_CLASSES);
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassTitle, setNewClassTitle] = useState('');
  const [newClassCategory, setNewClassCategory] = useState<'HIIT' | 'Yoga' | 'Strength' | 'Spinning'>('HIIT');
  const [newClassTime, setNewClassTime] = useState('06:00 PM - 07:00 PM');

  // Helper to calculate days until expiry
  const getDaysUntilExpiry = (userId: string) => {
    const m = memberships.find(mem => mem.user_id === userId);
    if (!m) return null;
    return Math.ceil((new Date(m.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredUsers = localUsers.filter(u => {
    const matchesSearch = (u.full_name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                          (u.email || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    if (!matchesSearch) return false;
    
    if (filterStatus === 'All') return true;
    
    const membership = memberships.find(m => m.user_id === u.user_id);
    const isActive = membership ? membership.status === 'Active' && new Date(membership.end_date) >= new Date() : false;
    
    if (filterStatus === 'Active') return isActive;
    if (filterStatus === 'Expired') return !isActive;
    if (filterStatus === 'DueRenewal') {
       const days = getDaysUntilExpiry(u.user_id);
       return days !== null && days >= 0 && days <= 3; // Show those expiring in 0-3 days
    }
    return true;
  });

  // Sort DueRenewals so the most urgent (fewest days left) are at the top
  if (filterStatus === 'DueRenewal') {
    filteredUsers.sort((a, b) => {
       const daysA = getDaysUntilExpiry(a.user_id) ?? 999;
       const daysB = getDaysUntilExpiry(b.user_id) ?? 999;
       return daysA - daysB;
    });
  }

  // Calculate Due Renewal Count for KPI
  const dueRenewalCount = localUsers.filter(u => {
     const days = getDaysUntilExpiry(u.user_id);
     return days !== null && days >= 0 && days <= 3;
  }).length;

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail) return;
    
    const client = getSupabase();
    if (!client) {
      alert('Cannot create a member: Supabase is not connected. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.');
      return;
    }

    try {
      // 1. Create a temporary client so signUp doesn't log the Admin out!
      const { url, anonKey } = getStoredSupabaseCredentials();
      const tempClient = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      
      // Auto-generate a secure temporary password
      const tempPassword = `GYM_${Math.random().toString(36).substring(2, 8).toUpperCase()}!`;
      
      // 2. Sign Up the user in Supabase Auth (This will trigger a confirmation email if enabled in Supabase)
      const { data: authData, error: authErr } = await tempClient.auth.signUp({
        email: newMemberEmail,
        password: tempPassword,
        options: {
           data: { full_name: newMemberName }
        }
      });
      
      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Failed to create user in Auth");
      
      const newUserId = authData.user.id;
      
      // 3. Insert into public.users using the ADMIN's authenticated client
      const newUser: User = {
        user_id: newUserId,
        gym_id: currentTenant.gym_id,
        role: newMemberRole,
        full_name: newMemberName,
        email: newMemberEmail,
        phone: newMemberPhone,
        date_of_birth: newMemberDob || undefined,
        qr_pass_code: `PASS_${newMemberRole.toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        created_at: new Date().toISOString()
      };
      
      const { error: dbErr } = await client.from('users').insert(newUser);
      if (dbErr) throw dbErr;
      
      // 4. Create a default membership based on selected plan
      if (newMemberRole === 'Member') {
         const planDetails = RENEWAL_PLANS[newMemberPlan];
         const mStart = new Date();
         const mEnd = new Date();
         mEnd.setMonth(mEnd.getMonth() + planDetails.duration);
         
         const newMembership = {
            user_id: newUserId,
            gym_id: currentTenant.gym_id,
            plan_name: `Pro Pass (${newMemberPlan})`,
            start_date: mStart.toISOString().split('T')[0],
            end_date: mEnd.toISOString().split('T')[0],
            status: 'Active',
            amount_paid: planDetails.price
         };
         const { error: mErr } = await client.from('memberships').insert(newMembership);
         if (mErr) console.error("Failed to assign default membership", mErr);
      }
      
      // 5. Refresh from the database rather than guessing at local state.
      setLocalUsers([newUser, ...localUsers]);
      await onRefresh();

      alert(
        `Member created.\n\n` +
        `Email: ${newMemberEmail}\n` +
        `Temporary password: ${tempPassword}\n\n` +
        `Share these credentials with the member. If email confirmation is on ` +
        `in Supabase, they must confirm before their first sign-in.`
      );

      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberPhone('');
      setNewMemberDob('');
      setIsAddingMember(false);

    } catch (error: any) {
      console.error(error);
      setActionError(describeDbError(error));
      alert(`Could not create the member.\n\n${describeDbError(error)}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Remove this member from the gym? This cannot be undone.')) return;

    // v1 only spliced the row out of React state, so the member reappeared on
    // the next refresh. This deletes the profile row for real.
    if (!isLive) {
      setLocalUsers(localUsers.filter(u => u.user_id !== id));
      return;
    }

    try {
      await dbDeleteUser(id);
      setLocalUsers(localUsers.filter(u => u.user_id !== id));
      await onRefresh();
    } catch (err) {
      setActionError(describeDbError(err));
    }
  };

  const handleRenewUser = async (userId: string) => {
    const client = getSupabase();
    if (!client) {
      alert('Cannot renew: Supabase is not connected.');
      return;
    }

    const planDetails = RENEWAL_PLANS[renewingPlan];
    const currentMembership = memberships.find(m => m.user_id === userId);
    
    let baseDate = new Date();
    if (currentMembership && new Date(currentMembership.end_date) > baseDate) {
       baseDate = new Date(currentMembership.end_date);
    }
    
    const mEnd = new Date(baseDate);
    mEnd.setMonth(mEnd.getMonth() + planDetails.duration);
    
    try {
      if (currentMembership) {
         const { error } = await client.from('memberships').update({
            plan_name: `Pro Pass (${renewingPlan})`,
            end_date: mEnd.toISOString().split('T')[0],
            status: 'Active',
            amount_paid: planDetails.price
         }).eq('id', currentMembership.id);
         if (error) throw error;
      } else {
         const newMembership = {
            user_id: userId,
            gym_id: currentTenant.gym_id,
            plan_name: `Pro Pass (${renewingPlan})`,
            start_date: new Date().toISOString().split('T')[0],
            end_date: mEnd.toISOString().split('T')[0],
            status: 'Active',
            amount_paid: planDetails.price
         };
         const { error } = await client.from('memberships').insert(newMembership);
         if (error) throw error;
      }
      setRenewingUserId(null);
      await onRefresh();
      alert(`Membership renewed for ${renewingPlan}.`);
    } catch (error: any) {
      console.error(error);
      setActionError(describeDbError(error));
      alert(`Could not renew this membership.\n\n${describeDbError(error)}`);
    }
  };

  const exportToCSV = () => {
    const headers = ['Internal ID', 'Name', 'Email', 'Role', 'Phone', 'DOB', 'Created At'];
    const rows = localUsers.map(u => 
      [u.member_internal_id || 'N/A', u.full_name, u.email, u.role, u.phone || '', u.date_of_birth || '', u.created_at]
    );
    // v1 joined rows with the two-character sequence backslash-n and ran the
    // result through encodeURI, producing a single-line file. Build a real Blob
    // instead, and quote fields so commas in names cannot break columns.
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `members_${currentTenant.name.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // v1 just spun the icon for 800ms without fetching anything.
  const handleRefresh = async () => {
    setActionError('');
    await onRefresh();
  };
  
  // Birthday Check
  const today = new Date().toISOString().split('T')[0].slice(5); // gets MM-DD
  const birthdayUsers = localUsers.filter(u => u.date_of_birth && u.date_of_birth.slice(5) === today);

  const handleAddClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassTitle) return;
    const newClass: GymClass = {
      id: `cls-${Date.now()}`,
      gym_id: currentTenant.gym_id,
      title: newClassTitle,
      instructor_name: 'Coach Marcus Vance',
      category: newClassCategory,
      time: newClassTime,
      day: 'Today',
      durationMinutes: 60,
      maxCapacity: 20,
      bookedCount: 0,
      room: 'Studio Zone A',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=400'
    };
    setGymClasses((prev) => [newClass, ...prev]);
    setNewClassTitle('');
    setShowAddClass(false);
  };

  const fetchAiInsights = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/gym-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeMembers: currentTenant.member_count || 342,
          totalRevenue: currentTenant.monthly_revenue || 684000,
          expiringMemberships: 14,
          occupancyRate: 82
        })
      });
      const data = await res.json();
      if (data.insights) {
        setAiInsights(data.insights);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="p-4 space-y-4 text-slate-100 pb-16 max-w-5xl mx-auto">
      
      {/* ADMIN TOP BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900/90 p-4 rounded-3xl border border-slate-800 gap-3 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-lg text-white">{currentTenant.name} Portal</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Multi-Tenant Franchise HQ • {currentTenant.address}</p>
        </div>

        {/* Tenant Selector & AI Advisor Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* v1 rendered a dropdown of MOCK tenants. Selecting one swapped in a
              gym_id that does not exist in the database and emptied every
              screen. This shows the real, signed-in gym instead. */}
          <div className="bg-slate-950 border border-slate-800 text-xs font-bold text-emerald-400 px-3 py-2 rounded-xl flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" />
            <span className="truncate max-w-[160px]">{currentTenant.name}</span>
          </div>

          <button
            onClick={handleRefresh}
            className={`p-2 bg-slate-800 text-slate-300 rounded-xl hover:text-white transition-all ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={fetchAiInsights}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-current" />
            <span>{loadingAi ? 'Analyzing...' : 'AI Advisor'}</span>
          </button>
        </div>
      </div>
      
      {/* BIRTHDAY ALERTS */}
      {birthdayUsers.length > 0 && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between shadow-lg gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
               <Cake className="w-5 h-5" />
             </div>
             <div>
               <h3 className="font-bold text-indigo-400 text-sm">Birthday Alerts</h3>
               <p className="text-xs text-indigo-400/80">It's {birthdayUsers.map(u => u.full_name).join(', ')}'s birthday today! Send them a wish.</p>
             </div>
          </div>
        </div>
      )}

      {/* ADMIN NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
        {[
          { id: 'analytics', label: 'Franchise Overview', icon: TrendingUp },
          { id: 'members', label: 'Members Directory', icon: Users },
          { id: 'approvals', label: 'Payment Approvals', icon: CreditCard, badge: pendingPayments },
          { id: 'classes', label: 'Classes & Studio', icon: Calendar },
          { id: 'pos', label: 'Front-Desk POS', icon: ShoppingBag },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/15'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {'badge' in tab && (tab as any).badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  isActive ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                }`}>
                  {(tab as any).badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: FRANCHISE OVERVIEW */}
      {activeTab === 'analytics' && (
        <div className="space-y-4 animate-in fade-in">
          {/* KPI METRICS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium">Active Members</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-extrabold text-white">{localUsers.filter(u => u.role === 'Member').length}</p>
              <p className="text-[10px] text-emerald-400 font-medium mt-1">Total Registered</p>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium">Active Memberships</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-extrabold text-white">{memberships.filter(m => m.status === 'Active').length}</p>
              <p className="text-[10px] text-emerald-400 font-medium mt-1">Currently Active</p>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium">Check-ins Today</span>
                <QrCode className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-extrabold text-white">{attendance.filter(a => a.check_in?.slice(0, 10) === new Date().toISOString().split('T')[0]).length} Passes</p>
              <p className="text-[10px] text-indigo-400 font-medium mt-1">Today's Traffic</p>
            </div>

            {/* KPI: Due Renewals */}
            <div 
              onClick={() => { setActiveTab('members'); setFilterStatus('DueRenewal'); }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg cursor-pointer hover:border-rose-500/50 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium">Due Renewal</span>
                <AlertCircle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-xl font-extrabold text-white">{dueRenewalCount} Members</p>
              <p className="text-[10px] text-rose-400 font-medium mt-1">Action Required</p>
            </div>

            {/* KPI: Payments awaiting approval */}
            <div
              onClick={() => setActiveTab('approvals')}
              className={`bg-slate-900 border rounded-2xl p-4 shadow-lg cursor-pointer transition-colors ${
                pendingPayments > 0
                  ? 'border-amber-500/40 hover:border-amber-500/70'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium">Payments to Approve</span>
                <CreditCard className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-extrabold text-white">{pendingPayments} Pending</p>
              <p className="text-[10px] text-amber-400 font-medium mt-1">
                {pendingPayments > 0 ? 'Awaiting your review' : 'All caught up'}
              </p>
            </div>
          </div>

          {/* AI ADVISOR MODAL / PANEL */}
          {aiInsights && (
            <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-5 rounded-3xl border border-emerald-500/40 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-white">AI Franchise Strategy Insights</h3>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30">
                  Health Score: {aiInsights.healthScore}/100
                </span>
              </div>

              <p className="text-xs text-emerald-200 font-medium">{aiInsights.statusSummary}</p>

              <div className="space-y-2 pt-1">
                {aiInsights.recommendations?.map((rec: any, i: number) => (
                  <div key={i} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
                    <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider">{rec.category}: </span>
                    <span className="text-slate-200">{rec.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REVENUE & MEMBERSHIP GROWTH CHART */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-100">Revenue & Membership Growth</h3>
              </div>
              <span className="text-xs text-slate-400">2026 H1 Financial Performance</span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_STATS_DATA}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" name="Revenue (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* REAL-TIME ATTENDANCE LOG */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-100">Live Gate Turnstile Feed</h3>
              </div>
              <button
                onClick={onOpenQRScanner}
                className="text-xs text-emerald-400 font-bold hover:text-emerald-300 flex items-center gap-1"
              >
                <span>Launch Gate Scanner</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {attendance.map(att => (
                <div key={att.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    {att.status === 'GRANTED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <div>
                      <p className="font-bold text-slate-200">{att.user_name || 'Gym Member'}</p>
                      <p className="text-[10px] text-slate-400">{att.gate_location}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERS DIRECTORY */}
      {activeTab === 'members' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-base text-slate-100">Member & Staff Registry</h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportToCSV}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1 transition-all border border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  onClick={() => setIsAddingMember(!isAddingMember)}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 shadow-md shadow-emerald-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Member</span>
                </button>
              </div>
            </div>

            {/* ADD MEMBER FORM */}
            {isAddingMember && (
              <form onSubmit={handleAddMemberSubmit} className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs font-bold text-emerald-400">Register New Member (Auto-emails credentials)</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                    required
                  />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                    required
                  />
                  <input 
                    type="date" 
                    value={newMemberDob}
                    onChange={(e) => setNewMemberDob(e.target.value)}
                    className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                  />
                  <input 
                    type="tel" 
                    placeholder="Mobile Number" 
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={newMemberRole}
                    onChange={(e: any) => setNewMemberRole(e.target.value)}
                    className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                  >
                    <option value="Member">Member</option>
                    <option value="Trainer">Trainer</option>
                    <option value="Admin">Admin</option>
                  </select>
                  {newMemberRole === 'Member' && (
                    <select
                      value={newMemberPlan}
                      onChange={(e: any) => setNewMemberPlan(e.target.value)}
                      className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-emerald-400 font-bold flex-1"
                    >
                      {Object.entries(RENEWAL_PLANS).map(([planName, details]) => (
                        <option key={planName} value={planName}>{planName} - ₹{details.price}</option>
                      ))}
                    </select>
                  )}
                  <button 
                    type="submit"
                    disabled={isAddingMember}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all flex-1"
                  >
                    {isAddingMember ? 'Creating...' : 'Send Credentials'}
                  </button>
                </div>
              </form>
            )}

            {/* SEARCH & FILTERS */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search by name, email or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 pl-9 pr-3 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs w-full sm:w-auto">
                {(['All', 'Active', 'Expired', 'DueRenewal'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition-all ${
                      filterStatus === status 
                        ? 'bg-emerald-500 text-slate-950' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {status === 'DueRenewal' ? 'Due Renewals' : status}
                  </button>
                ))}
              </div>
            </div>

            {/* MEMBERS LIST */}
            <div className="space-y-2.5">
              {filteredUsers.map(usr => {
                const mship = memberships.find(m => m.user_id === usr.user_id);
                const isActive = mship ? mship.status === 'Active' && new Date(mship.end_date) >= new Date() : false;
                
                const daysToExpiry = getDaysUntilExpiry(usr.user_id);
                let expiryBadge = null;
                if (daysToExpiry !== null) {
                  if (daysToExpiry < 0) expiryBadge = <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[9px] font-bold">Expired {Math.abs(daysToExpiry)} days ago</span>;
                  else if (daysToExpiry === 0) expiryBadge = <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded text-[9px] font-bold">Expires Today!</span>;
                  else if (daysToExpiry <= 3) expiryBadge = <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[9px] font-bold">Expires in {daysToExpiry} days</span>;
                }

                return (
                  <div 
                    key={usr.user_id}
                    className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={usr.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'} 
                        alt={usr.full_name} 
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-100 text-sm">{usr.full_name}</p>
                          {expiryBadge}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{usr.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`hidden sm:inline-block px-2.5 py-1 text-[10px] font-bold rounded-full ${
                        isActive 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {isActive ? 'Active' : 'Expired'}
                      </span>

                      {usr.role === 'Member' && (
                        <>
                          {renewingUserId === usr.user_id ? (
                             <div className="flex items-center gap-1">
                               <select
                                 value={renewingPlan}
                                 onChange={(e: any) => setRenewingPlan(e.target.value)}
                                 className="bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg text-[10px] text-emerald-400 font-bold"
                               >
                                 {Object.entries(RENEWAL_PLANS).map(([planName, details]) => (
                                   <option key={planName} value={planName}>{planName}</option>
                                 ))}
                               </select>
                               <button
                                 onClick={() => handleRenewUser(usr.user_id)}
                                 className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold rounded-lg"
                               >
                                 Confirm
                               </button>
                               <button
                                 onClick={() => setRenewingUserId(null)}
                                 className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg"
                               >
                                 Cancel
                               </button>
                             </div>
                          ) : (
                             <button
                               onClick={() => setRenewingUserId(usr.user_id)}
                               className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 text-[10px] font-bold rounded-lg transition-colors"
                             >
                               Renew Plan
                             </button>
                          )}
                        </>
                      )}
                      
                      {/* Admin Actions */}
                      <div className="flex items-center gap-1 border-l border-slate-700 pl-3 ml-1">
                        <button className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors" title="Edit details">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteUser(usr.user_id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors" title="Delete member">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-4 animate-in fade-in">
          <div>
            <h2 className="text-lg font-extrabold text-white">Payment Approvals</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Members request a renewal after paying at the desk. Approving here
              is what extends their membership.
            </p>
          </div>
          <PaymentApprovalsPanel
            payments={payments}
            onApprove={onApprovePayment}
            onReject={onRejectPayment}
            isLive={isLive}
          />
        </div>
      )}

      {/* TAB 3: CLASSES & STUDIO */}
      {activeTab === 'classes' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-100">Studio Schedule Management</h3>
                <p className="text-xs text-slate-400">Manage group sessions, trainers, and max capacities</p>
              </div>

              <button
                onClick={() => setShowAddClass(!showAddClass)}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
              >
                <Plus className="w-4 h-4" /> Add New Class
              </button>
            </div>

            {showAddClass && (
              <form onSubmit={handleAddClassSubmit} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-emerald-400">Schedule Studio Class</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Class Title (e.g. Boxing HIIT)"
                    value={newClassTitle}
                    onChange={(e) => setNewClassTitle(e.target.value)}
                    className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                    required
                  />
                  <select
                    value={newClassCategory}
                    onChange={(e: any) => setNewClassCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                  >
                    <option value="HIIT">HIIT</option>
                    <option value="Yoga">Yoga</option>
                    <option value="Strength">Strength</option>
                    <option value="Spinning">Spinning</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Time (e.g. 06:00 PM - 07:00 PM)"
                    value={newClassTime}
                    onChange={(e) => setNewClassTime(e.target.value)}
                    className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Publish Class Schedule
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gymClasses.map((cls) => (
                <div key={cls.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-emerald-400 rounded uppercase">
                      {cls.category}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{cls.bookedCount}/{cls.maxCapacity} Booked</span>
                  </div>
                  <h4 className="font-bold text-slate-100 text-sm">{cls.title}</h4>
                  <p className="text-xs text-slate-400">{cls.instructor_name} • {cls.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FRONT-DESK POS */}
      {activeTab === 'pos' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-lg">
            <h3 className="font-bold text-base text-slate-100">Front-Desk Counter POS Inventory</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INITIAL_PRODUCTS.map((prod) => (
                <div key={prod.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-100 text-xs">{prod.name}</h4>
                    <p className="text-[11px] text-slate-400 font-semibold">Stock: {prod.stock} units</p>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-400">₹{prod.priceINR.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
