import { getSupabase } from './supabase';
import {
  Tenant,
  User,
  Membership,
  AttendanceRecord,
  WorkoutPlan,
  PaymentRequest,
  PaymentMethod,
} from './types';

export interface GymSnapshot {
  tenant: Tenant | null;
  users: User[];
  memberships: Membership[];
  attendance: AttendanceRecord[];
  payments: PaymentRequest[];
}

function client() {
  const c = getSupabase();
  if (!c) throw new Error('Supabase is not configured.');
  return c;
}

/** Reads the signed-in user's own profile row. */
export async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await client()
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as User) ?? null;
}

/**
 * Loads everything the dashboards need in one pass.
 *
 * The tenant is fetched from the database rather than assumed. v1 kept the
 * mock tenant (gym_id "gym-tenant-001") in state while real rows carried a
 * UUID gym_id, so every `row.gym_id === currentTenant.gym_id` filter in the
 * dashboards discarded 100% of the real data.
 */
export async function fetchGymSnapshot(profile: User): Promise<GymSnapshot> {
  const c = client();

  const [tenantRes, usersRes, membershipsRes, attendanceRes, paymentsRes] = await Promise.all([
    c.from('tenants').select('*').eq('gym_id', profile.gym_id).maybeSingle(),
    c.from('users').select('*').eq('gym_id', profile.gym_id).order('created_at', { ascending: false }),
    c.from('memberships').select('*').eq('gym_id', profile.gym_id),
    c.from('attendance').select('*').eq('gym_id', profile.gym_id).order('check_in', { ascending: false }).limit(200),
    c.from('payments').select('*').eq('gym_id', profile.gym_id).order('created_at', { ascending: false }).limit(200),
  ]);

  if (tenantRes.error) throw tenantRes.error;
  if (usersRes.error) throw usersRes.error;
  if (membershipsRes.error) throw membershipsRes.error;
  if (attendanceRes.error) throw attendanceRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  const userNameById = new Map<string, string>(
    ((usersRes.data as User[]) ?? []).map((u) => [u.user_id, u.full_name]),
  );

  return {
    tenant: (tenantRes.data as Tenant) ?? null,
    users: (usersRes.data as User[]) ?? [],
    memberships: (membershipsRes.data as Membership[]) ?? [],
    attendance: ((attendanceRes.data as AttendanceRecord[]) ?? []).map((a) => ({
      ...a,
      user_name: userNameById.get(a.user_id) ?? 'Unknown',
    })),
    payments: ((paymentsRes.data as PaymentRequest[]) ?? []).map((p) => ({
      ...p,
      user_name: userNameById.get(p.user_id) ?? 'Unknown',
    })),
  };
}

export async function recordAttendance(params: {
  userId: string;
  gymId: string;
  gateLocation?: string;
  status: 'GRANTED' | 'DENIED';
  verifiedBy?: string | null;
}): Promise<AttendanceRecord> {
  const { data, error } = await client()
    .from('attendance')
    .insert({
      user_id: params.userId,
      gym_id: params.gymId,
      gate_location: params.gateLocation ?? 'Turnstile Gate 1 - Main Entry',
      status: params.status,
      verified_by: params.verifiedBy ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AttendanceRecord;
}

/** Looks up a member by their printed QR pass code, within the caller's gym. */
export async function findUserByPassCode(
  gymId: string,
  passCode: string,
): Promise<User | null> {
  const { data, error } = await client()
    .from('users')
    .select('*')
    .eq('gym_id', gymId)
    .eq('qr_pass_code', passCode.trim())
    .maybeSingle();

  if (error) throw error;
  return (data as User) ?? null;
}

export async function fetchActiveMembership(userId: string): Promise<Membership | null> {
  const { data, error } = await client()
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as Membership) ?? null;
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await client().from('users').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function updateUser(userId: string, patch: Partial<User>): Promise<void> {
  const { error } = await client().from('users').update(patch).eq('user_id', userId);
  if (error) throw error;
}

export async function upsertMembership(m: {
  id?: string;
  user_id: string;
  gym_id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  amount_paid: number;
  status?: 'Active' | 'Expired' | 'Pending';
  payment_status?: 'Paid' | 'Pending' | 'Failed';
}): Promise<void> {
  const c = client();
  const payload = {
    user_id: m.user_id,
    gym_id: m.gym_id,
    plan_name: m.plan_name,
    start_date: m.start_date,
    end_date: m.end_date,
    amount_paid: m.amount_paid,
    status: m.status ?? 'Active',
    payment_status: m.payment_status ?? 'Paid',
  };

  const { error } = m.id
    ? await c.from('memberships').update(payload).eq('id', m.id)
    : await c.from('memberships').insert(payload);

  if (error) throw error;
}

/**
 * Raises a payment request for admin approval. Status is always PENDING —
 * the RLS policy rejects any other value from a non-staff member, so a member
 * cannot approve their own payment.
 */
export async function createPaymentRequest(p: {
  user_id: string;
  gym_id: string;
  plan_name: string;
  plan_months: number;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  reference?: string;
  member_note?: string;
}): Promise<PaymentRequest> {
  const { data, error } = await client()
    .from('payments')
    .insert({
      user_id: p.user_id,
      gym_id: p.gym_id,
      plan_name: p.plan_name,
      plan_months: p.plan_months,
      amount: p.amount,
      currency: p.currency ?? 'INR',
      method: p.method,
      reference: p.reference?.trim() || null,
      member_note: p.member_note?.trim() || null,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error) throw error;
  return data as PaymentRequest;
}

/**
 * Approves a request. This calls a SECURITY DEFINER function so that stamping
 * the payment, extending the membership and notifying the member happen in a
 * single transaction — a partial approval would leave a member paid but not
 * extended.
 */
export async function approvePayment(
  paymentId: string,
  adminNote?: string,
): Promise<{ new_end_date: string }> {
  const { data, error } = await client().rpc('approve_payment', {
    p_payment_id: paymentId,
    p_admin_note: adminNote?.trim() || null,
  });
  if (error) throw error;
  return data as { new_end_date: string };
}

export async function rejectPayment(paymentId: string, adminNote?: string): Promise<void> {
  const { error } = await client().rpc('reject_payment', {
    p_payment_id: paymentId,
    p_admin_note: adminNote?.trim() || null,
  });
  if (error) throw error;
}

/** A member withdrawing their own request while it is still pending. */
export async function cancelPaymentRequest(paymentId: string): Promise<void> {
  const { error } = await client().from('payments').delete().eq('id', paymentId);
  if (error) throw error;
}

export async function saveWorkoutPlan(
  userId: string,
  gymId: string,
  plan: WorkoutPlan,
): Promise<void> {
  const { error } = await client().from('workouts').insert({
    user_id: userId,
    gym_id: gymId,
    title: plan.title,
    plan_data: plan as unknown as Record<string, unknown>,
    assigned_by: plan.assignedBy ?? 'AI Trainer',
  });
  if (error) throw error;
}

export async function fetchLatestWorkout(userId: string): Promise<WorkoutPlan | null> {
  const { data, error } = await client()
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as { id: string; user_id: string; gym_id: string; plan_data: WorkoutPlan; created_at: string };
  return { ...row.plan_data, id: row.id, user_id: row.user_id, gym_id: row.gym_id, created_at: row.created_at };
}

/** Turns a Supabase/PostgREST error into something a human can act on. */
export function describeDbError(err: unknown): string {
  const e = err as { code?: string; message?: string; details?: string; hint?: string };
  if (!e) return 'Unknown error.';

  switch (e.code) {
    case '42501':
      return 'Permission denied by a row-level security policy. Re-run supabase_schema.sql.';
    case '42P17':
      return 'Infinite recursion in an RLS policy. Re-run supabase_schema.sql to replace the old policies.';
    case '42P01':
      return 'A table is missing. Run supabase_schema.sql in the Supabase SQL Editor.';
    case '23505':
      return 'That record already exists (duplicate value).';
    case '23503':
      return 'Related record not found — check the gym or user reference.';
    case '22P02':
      return 'Invalid ID format. Expected a UUID.';
    case '22023':
      return e.message || 'This request has already been reviewed.';
    case 'P0002':
      return 'That payment request no longer exists.';
    case 'PGRST301':
      return 'Your session expired. Please sign in again.';
    default:
      return e.message || e.details || e.hint || 'Unexpected database error.';
  }
}
