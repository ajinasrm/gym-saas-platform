export type Role = 'Admin' | 'Trainer' | 'Member';

export type SubscriptionTier = 'Free' | 'Starter' | 'Pro' | 'Enterprise';

export interface Tenant {
  gym_id: string;
  name: string;
  logo_url?: string;
  subscription_tier: SubscriptionTier;
  currency: string;
  address?: string;
  member_count?: number;
  monthly_revenue?: number;
}

export interface User {
  user_id: string;
  gym_id: string;
  member_internal_id?: number;
  role: Role;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  weight?: number;
  height?: number;
  avatar_url?: string;
  qr_pass_code: string;
  assigned_trainer_id?: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  gym_id: string;
  subject?: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  gym_id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  amount_paid: number;
  payment_status: 'Paid' | 'Pending' | 'Failed';
  status: 'Active' | 'Expired' | 'Pending';
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  gym_id: string;
  user_name?: string;
  check_in: string;
  gate_location: string;
  status: 'GRANTED' | 'DENIED';
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  tempo?: string;
  formTip?: string;
  completed?: boolean;
}

export interface WorkoutScheduleDay {
  dayName: string;
  focus: string;
  warmup: string[];
  exercises: Exercise[];
  cooldown: string[];
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  gym_id: string;
  title: string;
  summary: string;
  weeklyFrequency: number;
  estimatedDurationMinutes: number;
  schedule: WorkoutScheduleDay[];
  nutritionAdvice?: string[];
  assignedBy?: string;
  created_at: string;
}

export type PaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Card'
  | 'Bank Transfer'
  | 'Cheque'
  | 'Other';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * A payment awaiting admin approval. There is no online gateway: money is
 * collected offline and an Admin approves the request, which is what extends
 * the membership.
 */
export interface PaymentRequest {
  id: string;
  user_id: string;
  gym_id: string;
  plan_name: string;
  plan_months: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  reference?: string | null;
  member_note?: string | null;
  admin_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  /** Joined client-side for display. */
  user_name?: string;
}

export interface BodyProgressMetric {
  date: string;
  weightKg: number;
  bodyFatPercent: number;
  muscleMassKg: number;
}

export interface GymClass {
  id: string;
  gym_id: string;
  title: string;
  instructor_name: string;
  category: 'HIIT' | 'Yoga' | 'Strength' | 'Spinning' | 'Zumba' | 'CrossFit';
  time: string;
  day: string;
  durationMinutes: number;
  maxCapacity: number;
  bookedCount: number;
  room: string;
  imageUrl?: string;
}

export interface ClassBooking {
  id: string;
  class_id: string;
  user_id: string;
  class_title: string;
  time: string;
  day: string;
  status: 'CONFIRMED' | 'CANCELLED';
  booked_at: string;
}

export interface SupplementProduct {
  id: string;
  name: string;
  category: 'Supplements' | 'Apparel' | 'Gear' | 'Beverages';
  priceINR: number;
  rating: number;
  stock: number;
  imageUrl: string;
  description: string;
}

export interface MealItem {
  id: string;
  name: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Post-Workout';
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  time: string;
}

export interface DailyNutritionSummary {
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  meals: MealItem[];
  waterGlassCount: number;
}

