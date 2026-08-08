import React, { useState, useEffect } from 'react';
import { AndroidFrame } from './components/AndroidFrame';
import { MemberDashboard } from './components/screens/MemberDashboard';
import { AdminDashboard } from './components/screens/AdminDashboard';
import { TrainerDashboard } from './components/screens/TrainerDashboard';
import { RazorpayModal } from './components/RazorpayModal';
import { QRScannerModal } from './components/QRScannerModal';
import { AIWorkoutModal } from './components/AIWorkoutModal';
import { LoginScreen } from './components/LoginScreen';

import { Role, Tenant, User, Membership, AttendanceRecord, WorkoutPlan } from './lib/types';
import { 
  INITIAL_TENANTS, 
  INITIAL_USERS, 
  INITIAL_MEMBERSHIPS, 
  INITIAL_ATTENDANCE, 
  INITIAL_WORKOUT, 
  INITIAL_BODY_METRICS 
} from './lib/mockData';
import { getSupabase } from './lib/supabase';

export default function App() {
  // Tenancy & Auth State
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [currentTenant, setCurrentTenant] = useState<Tenant>(INITIAL_TENANTS[0]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Data State
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [memberships, setMemberships] = useState<Membership[]>(INITIAL_MEMBERSHIPS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan>(INITIAL_WORKOUT);
  const [bodyMetrics] = useState(INITIAL_BODY_METRICS);

  // Modals State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentPlanName, setPaymentPlanName] = useState('Pro Gym Membership');
  const [paymentAmount, setPaymentAmount] = useState(2999);

  const [isQROpen, setIsQROpen] = useState(false);
  const [isAIWorkoutOpen, setIsAIWorkoutOpen] = useState(false);
  const [isLiveSupabaseConnected, setIsLiveSupabaseConnected] = useState(false);

  // Check Supabase connection status & Auth Session
  useEffect(() => {
    const client = getSupabase();
    setIsLiveSupabaseConnected(!!client);
    
    if (client) {
      // 1. Restore session on mount
      client.auth.getSession().then(({ data: { session } }) => {
         if (session?.user) {
            client.from('users').select('*').eq('user_id', session.user.id).single()
              .then(({ data }) => {
                 if (data) setCurrentUser(data as User);
              });
         }
      });

      // 2. Listen to auth changes (logout, etc)
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
         if (!session) setCurrentUser(null);
      });
      
      return () => subscription.unsubscribe();
    }
  }, []);

  // Fetch Real Data only WHEN a user is logged in (to pass RLS policies)
  useEffect(() => {
    const client = getSupabase();
    if (client && currentUser) {
      const fetchRealData = async () => {
        try {
          const { data: realUsers, error: uErr } = await client.from('users').select('*');
          if (realUsers && !uErr) setUsers(realUsers as User[]);

          const { data: realMemberships, error: mErr } = await client.from('memberships').select('*');
          if (realMemberships && !mErr) setMemberships(realMemberships as Membership[]);

          const { data: realAttendance, error: aErr } = await client.from('attendance').select('*');
          if (realAttendance && !aErr) setAttendance(realAttendance as AttendanceRecord[]);
        } catch (e) {
           console.error("Failed to fetch real data", e);
        }
      };
      fetchRealData();
    }
  }, [currentUser]);

  const currentMembership = currentUser ? memberships.find(m => m.user_id === currentUser.user_id) : undefined;
  const assignedClients = currentUser 
    ? users.filter(u => u.role === 'Member' && u.gym_id === currentTenant.gym_id && u.assigned_trainer_id === currentUser.user_id)
    : [];

  // Action Handlers
  const handleOpenPayment = (planName: string, amount: number) => {
    setPaymentPlanName(planName);
    setPaymentAmount(amount);
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = (transactionId: string) => {
    // Update membership status
    if (!currentUser) return;
    setMemberships(prev => prev.map(m => {
      if (m.user_id === currentUser.user_id) {
        return {
          ...m,
          status: 'Active',
          payment_status: 'Paid',
          end_date: '2026-12-31'
        };
      }
      return m;
    }));
  };

  const handleCheckInRecorded = (userName: string, isGranted: boolean) => {
    if (!currentUser) return;
    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}`,
      user_id: currentUser.user_id,
      gym_id: currentTenant.gym_id,
      user_name: userName,
      check_in: new Date().toISOString(),
      gate_location: 'Turnstile Gate 1 - Main Entry',
      status: isGranted ? 'GRANTED' : 'DENIED'
    };
    setAttendance(prev => [newRecord, ...prev]);
  };

  const handleAddMember = (newUserPartial: Partial<User>) => {
    const newUser: User = {
      user_id: `usr_${Math.random().toString(36).substring(2, 8)}`,
      gym_id: newUserPartial.gym_id || currentTenant.gym_id,
      role: newUserPartial.role || 'Member',
      full_name: newUserPartial.full_name || 'New Gym Member',
      email: newUserPartial.email || 'member@gym.com',
      qr_pass_code: newUserPartial.qr_pass_code || `PASS_MEMBER_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      created_at: new Date().toISOString()
    };

    setUsers(prev => [...prev, newUser]);

    // Create default active membership
    const newMembership: Membership = {
      id: `mship_${Date.now()}`,
      user_id: newUser.user_id,
      gym_id: currentTenant.gym_id,
      plan_name: 'Monthly Pro Starter',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '2026-12-31',
      amount_paid: 2999,
      payment_status: 'Paid',
      status: 'Active'
    };

    setMemberships(prev => [...prev, newMembership]);
  };

  if (!currentUser) {
    return <LoginScreen onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <AndroidFrame
      tenants={tenants}
      currentTenant={currentTenant}
      onSelectTenant={(t) => setCurrentTenant(t)}
      currentUser={currentUser}
      onOpenQRScanner={() => setIsQROpen(true)}
      onOpenAIWorkoutModal={() => setIsAIWorkoutOpen(true)}
      isLiveSupabaseConnected={isLiveSupabaseConnected}
      onLogout={() => setCurrentUser(null)}
    >
      {/* SCREEN ROUTER BASED ON ROLE */}
      {currentUser.role === 'Member' && (
        <MemberDashboard
          user={currentUser}
          membership={currentMembership}
          tenant={currentTenant}
          workoutPlan={workoutPlan}
          bodyMetrics={bodyMetrics}
          onOpenQRPass={() => setIsQROpen(true)}
          onOpenPaymentModal={handleOpenPayment}
          onOpenAIWorkoutModal={() => setIsAIWorkoutOpen(true)}
        />
      )}

      {currentUser.role === 'Admin' && (
        <AdminDashboard
          tenant={currentTenant}
          users={users.filter(u => u.gym_id === currentTenant.gym_id)}
          memberships={memberships.filter(m => m.gym_id === currentTenant.gym_id)}
          attendance={attendance.filter(a => a.gym_id === currentTenant.gym_id)}
          onOpenQRScanner={() => setIsQROpen(true)}
          onOpenPaymentModal={handleOpenPayment}
          onAddMember={handleAddMemberSubmit => handleAddMember(handleAddMemberSubmit)}
        />
      )}

      {currentUser.role === 'Trainer' && (
        <TrainerDashboard
          trainer={currentUser}
          tenant={currentTenant}
          assignedClients={assignedClients}
          workoutPlan={workoutPlan}
          onOpenAIWorkoutModal={() => setIsAIWorkoutOpen(true)}
        />
      )}

      {/* MODALS */}
      <RazorpayModal
        planName={paymentPlanName}
        amount={paymentAmount}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <QRScannerModal
        user={currentUser}
        tenant={currentTenant}
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        onCheckInRecorded={handleCheckInRecorded}
      />



      <AIWorkoutModal
        isOpen={isAIWorkoutOpen}
        onClose={() => setIsAIWorkoutOpen(false)}
        onPlanGenerated={(newPlan) => setWorkoutPlan(newPlan)}
      />
    </AndroidFrame>
  );
}
