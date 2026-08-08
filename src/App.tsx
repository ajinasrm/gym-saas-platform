import React, { useState, useEffect, useCallback } from 'react';
import { AndroidFrame } from './components/AndroidFrame';
import { MemberDashboard } from './components/screens/MemberDashboard';
import { AdminDashboard } from './components/screens/AdminDashboard';
import { TrainerDashboard } from './components/screens/TrainerDashboard';
import { PaymentRequestModal } from './components/PaymentRequestModal';
import { QRScannerModal } from './components/QRScannerModal';
import { AIWorkoutModal } from './components/AIWorkoutModal';
import { LoginScreen } from './components/LoginScreen';

import {
  Tenant, User, Membership, AttendanceRecord, WorkoutPlan,
  PaymentRequest, PaymentMethod,
} from './lib/types';
import {
  INITIAL_TENANTS,
  INITIAL_USERS,
  INITIAL_MEMBERSHIPS,
  INITIAL_ATTENDANCE,
  INITIAL_WORKOUT,
  INITIAL_BODY_METRICS,
} from './lib/mockData';
import { getSupabase, isSupabaseConfigured } from './lib/supabase';
import {
  fetchProfile,
  fetchGymSnapshot,
  fetchLatestWorkout,
  recordAttendance,
  createPaymentRequest,
  approvePayment,
  rejectPayment,
  saveWorkoutPlan,
  describeDbError,
} from './lib/db';

export default function App() {
  const liveMode = isSupabaseConfigured();

  const [booting, setBooting] = useState(liveMode);
  const [currentTenant, setCurrentTenant] = useState<Tenant>(INITIAL_TENANTS[0]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [memberships, setMemberships] = useState<Membership[]>(INITIAL_MEMBERSHIPS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan>(INITIAL_WORKOUT);
  const [bodyMetrics] = useState(INITIAL_BODY_METRICS);

  const [dataError, setDataError] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentPlanName, setPaymentPlanName] = useState('Pro Gym Membership');
  const [paymentAmount, setPaymentAmount] = useState(2999);
  const [paymentMonths, setPaymentMonths] = useState(1);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isAIWorkoutOpen, setIsAIWorkoutOpen] = useState(false);

  /**
   * Pulls the tenant, roster, memberships and attendance for the signed-in
   * user's gym. The tenant comes from the database — v1 kept the mock tenant
   * in state, so every gym_id comparison in the dashboards failed and the
   * screens rendered empty even when the queries succeeded.
   */
  const loadGymData = useCallback(async (profile: User) => {
    if (!isSupabaseConfigured()) return;
    setIsRefreshing(true);
    setDataError('');
    try {
      const snap = await fetchGymSnapshot(profile);
      if (snap.tenant) setCurrentTenant(snap.tenant);
      setUsers(snap.users);
      setMemberships(snap.memberships);
      setAttendance(snap.attendance);
      setPayments(snap.payments);

      const latest = await fetchLatestWorkout(profile.user_id);
      if (latest) setWorkoutPlan(latest);
    } catch (err) {
      console.error('Failed to load gym data', err);
      setDataError(describeDbError(err));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Restore an existing session on mount, then react to sign-in / sign-out.
  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setBooting(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await client.auth.getSession();
        const sessionUser = data.session?.user;
        if (!sessionUser || cancelled) return;

        const profile = await fetchProfile(sessionUser.id);
        if (profile && !cancelled) {
          setCurrentUser(profile);
          await loadGymData(profile);
        }
      } catch (err) {
        console.error('Session restore failed', err);
        if (!cancelled) setDataError(describeDbError(err));
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setCurrentUser(null);
        setUsers(INITIAL_USERS);
        setMemberships(INITIAL_MEMBERSHIPS);
        setAttendance(INITIAL_ATTENDANCE);
        setPayments([]);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadGymData]);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    await loadGymData(user);
  };

  const handleLogout = async () => {
    const client = getSupabase();
    // v1 only cleared React state, so a page refresh silently signed you
    // straight back in from the persisted Supabase session.
    if (client) await client.auth.signOut();
    setCurrentUser(null);
  };

  const handleRefresh = useCallback(async () => {
    if (currentUser) await loadGymData(currentUser);
  }, [currentUser, loadGymData]);

  const currentMembership = currentUser
    ? memberships
        .filter((m) => m.user_id === currentUser.user_id)
        .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0]
    : undefined;

  const assignedClients = currentUser
    ? users.filter(
        (u) =>
          u.role === 'Member' &&
          u.gym_id === currentTenant.gym_id &&
          u.assigned_trainer_id === currentUser.user_id,
      )
    : [];

  const handleOpenPayment = (planName: string, amount: number, months = 1) => {
    setPaymentPlanName(planName);
    setPaymentAmount(amount);
    setPaymentMonths(months);
    setIsPaymentOpen(true);
  };

  /**
   * There is no online gateway. The member raises a request; an Admin approves
   * it, and the approval is what extends the membership. Members cannot
   * approve their own payment — the RLS policy on public.payments rejects any
   * status other than PENDING from a non-staff account.
   */
  const handleSubmitPaymentRequest = async (details: {
    method: PaymentMethod;
    reference: string;
    note: string;
  }) => {
    if (!currentUser) throw new Error('You must be signed in.');

    if (!isSupabaseConfigured()) {
      throw new Error('Demo mode — connect Supabase to submit a real request.');
    }

    try {
      const created = await createPaymentRequest({
        user_id: currentUser.user_id,
        gym_id: currentTenant.gym_id,
        plan_name: paymentPlanName,
        plan_months: paymentMonths,
        amount: paymentAmount,
        currency: currentTenant.currency || 'INR',
        method: details.method,
        reference: details.reference,
        member_note: details.note,
      });
      setPayments((prev) => [{ ...created, user_name: currentUser.full_name }, ...prev]);
    } catch (err) {
      throw new Error(describeDbError(err));
    }
  };

  const handleApprovePayment = async (paymentId: string, note: string) => {
    try {
      await approvePayment(paymentId, note);
      await handleRefresh();
    } catch (err) {
      throw new Error(describeDbError(err));
    }
  };

  const handleRejectPayment = async (paymentId: string, note: string) => {
    try {
      await rejectPayment(paymentId, note);
      await handleRefresh();
    } catch (err) {
      throw new Error(describeDbError(err));
    }
  };

  const handleCheckInRecorded = async (
    checkedInUser: User,
    isGranted: boolean,
    gate: string,
  ) => {
    const optimistic: AttendanceRecord = {
      id: `att_${Date.now()}`,
      user_id: checkedInUser.user_id,
      gym_id: currentTenant.gym_id,
      user_name: checkedInUser.full_name,
      check_in: new Date().toISOString(),
      gate_location: gate,
      status: isGranted ? 'GRANTED' : 'DENIED',
    };
    setAttendance((prev) => [optimistic, ...prev]);

    if (!isSupabaseConfigured() || !currentUser) return;

    try {
      // v1 never wrote check-ins anywhere — the log vanished on refresh.
      await recordAttendance({
        userId: checkedInUser.user_id,
        gymId: currentTenant.gym_id,
        gateLocation: gate,
        status: isGranted ? 'GRANTED' : 'DENIED',
        verifiedBy: currentUser.user_id,
      });
    } catch (err) {
      console.error('Failed to persist attendance', err);
      setDataError(describeDbError(err));
    }
  };

  const handlePlanGenerated = async (plan: WorkoutPlan) => {
    setWorkoutPlan(plan);
    if (!isSupabaseConfigured() || !currentUser) return;
    try {
      await saveWorkoutPlan(currentUser.user_id, currentTenant.gym_id, plan);
    } catch (err) {
      console.error('Failed to save workout plan', err);
      setDataError(describeDbError(err));
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Restoring your session…</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} allowDemo={!liveMode} />;
  }

  return (
    <AndroidFrame
      currentTenant={currentTenant}
      currentUser={currentUser}
      onOpenQRScanner={() => setIsQROpen(true)}
      onOpenAIWorkoutModal={() => setIsAIWorkoutOpen(true)}
      isLiveSupabaseConnected={liveMode}
      onLogout={handleLogout}
      dataError={dataError}
      onDismissError={() => setDataError('')}
    >
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
          users={users.filter((u) => u.gym_id === currentTenant.gym_id)}
          memberships={memberships.filter((m) => m.gym_id === currentTenant.gym_id)}
          attendance={attendance.filter((a) => a.gym_id === currentTenant.gym_id)}
          onOpenQRScanner={() => setIsQROpen(true)}
          payments={payments}
          onApprovePayment={handleApprovePayment}
          onRejectPayment={handleRejectPayment}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          isLive={liveMode}
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

      <PaymentRequestModal
        planName={paymentPlanName}
        planMonths={paymentMonths}
        amount={paymentAmount}
        currency={currentTenant.currency || 'INR'}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSubmitRequest={handleSubmitPaymentRequest}
        isLive={liveMode}
      />

      <QRScannerModal
        user={currentUser}
        tenant={currentTenant}
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        onCheckInRecorded={handleCheckInRecorded}
        isLive={liveMode}
      />

      <AIWorkoutModal
        isOpen={isAIWorkoutOpen}
        onClose={() => setIsAIWorkoutOpen(false)}
        onPlanGenerated={handlePlanGenerated}
      />
    </AndroidFrame>
  );
}
