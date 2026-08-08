import { Tenant, User, Membership, AttendanceRecord, WorkoutPlan, PaymentTransaction, BodyProgressMetric, GymClass, SupplementProduct, DailyNutritionSummary } from './types';

export const INITIAL_TENANTS: Tenant[] = [
  {
    gym_id: 'gym-tenant-001',
    name: 'Body Line Fitness centre',
    subscription_tier: 'Enterprise',
    currency: 'INR',
    address: 'Bandra West, Mumbai, India',
    member_count: 342,
    monthly_revenue: 684000,
  }
];

export const INITIAL_CLASSES: GymClass[] = [
  {
    id: 'cls-101',
    gym_id: 'gym-tenant-001',
    title: 'CrossFit Shred & Power',
    instructor_name: 'Coach Marcus Vance',
    category: 'CrossFit',
    time: '07:00 AM - 08:00 AM',
    day: 'Today',
    durationMinutes: 60,
    maxCapacity: 20,
    bookedCount: 16,
    room: 'Studio A - Turf Zone',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'cls-102',
    gym_id: 'gym-tenant-001',
    title: 'Sunrise Vinyasa Flow Yoga',
    instructor_name: 'Elena Rostova',
    category: 'Yoga',
    time: '08:30 AM - 09:30 AM',
    day: 'Today',
    durationMinutes: 60,
    maxCapacity: 15,
    bookedCount: 12,
    room: 'Zen Room B',
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'cls-103',
    gym_id: 'gym-tenant-001',
    title: 'High-Octane Spin Bike HIIT',
    instructor_name: 'Rohan Deshmukh',
    category: 'Spinning',
    time: '06:00 PM - 07:00 PM',
    day: 'Today',
    durationMinutes: 60,
    maxCapacity: 25,
    bookedCount: 22,
    room: 'Cycle Arena 1',
    imageUrl: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'cls-104',
    gym_id: 'gym-tenant-001',
    title: 'Hypertrophy Powerlifting Lab',
    instructor_name: 'Coach Marcus Vance',
    category: 'Strength',
    time: '07:30 PM - 08:30 PM',
    day: 'Tomorrow',
    durationMinutes: 60,
    maxCapacity: 12,
    bookedCount: 8,
    room: 'Heavy Barbell Platform',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=400'
  }
];

export const INITIAL_PRODUCTS: SupplementProduct[] = [
  {
    id: 'prod-01',
    name: 'Optimum Gold Standard 100% Whey (2kg)',
    category: 'Supplements',
    priceINR: 6499,
    rating: 4.9,
    stock: 24,
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=300',
    description: 'Ultra-filtered whey isolate for fast recovery and muscle building.'
  },
  {
    id: 'prod-02',
    name: 'Micronized Creatine Monohydrate (250g)',
    category: 'Supplements',
    priceINR: 1299,
    rating: 4.8,
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&q=80&w=300',
    description: 'Boost power output and cellular muscle hydration.'
  },
  {
    id: 'prod-03',
    name: 'Pro Leather Powerlifting Belt (10mm)',
    category: 'Gear',
    priceINR: 2499,
    rating: 4.9,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=300',
    description: 'Genuine leather core stabilization belt with steel lever buckle.'
  },
  {
    id: 'prod-04',
    name: 'Body Line Seamless Gym Compression Tee',
    category: 'Apparel',
    priceINR: 1499,
    rating: 4.7,
    stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=300',
    description: 'Sweat-wicking, 4-way stretch fabric engineered for intensity.'
  }
];

export const INITIAL_NUTRITION: DailyNutritionSummary = {
  targetCalories: 2400,
  targetProteinGrams: 160,
  targetCarbsGrams: 220,
  targetFatGrams: 65,
  waterGlassCount: 8,
  meals: [
    {
      id: 'meal-1',
      name: 'Oatmeal with Whey & Banana',
      mealType: 'Breakfast',
      calories: 450,
      proteinGrams: 32,
      carbsGrams: 58,
      fatGrams: 9,
      time: '08:30 AM'
    },
    {
      id: 'meal-2',
      name: 'Grilled Chicken Breast with Quinoa & Broccoli',
      mealType: 'Lunch',
      calories: 620,
      proteinGrams: 54,
      carbsGrams: 60,
      fatGrams: 14,
      time: '01:30 PM'
    },
    {
      id: 'meal-3',
      name: 'Post-Workout Protein Shake + Almonds',
      mealType: 'Post-Workout',
      calories: 320,
      proteinGrams: 28,
      carbsGrams: 15,
      fatGrams: 12,
      time: '06:15 PM'
    }
  ]
};


export const INITIAL_USERS: User[] = [
  {
    user_id: 'usr-admin-01',
    gym_id: 'gym-tenant-001',
    member_internal_id: 101,
    role: 'Admin',
    full_name: 'Vikramaditya Sharma',
    email: 'admin@bodyline.com',
    phone: '+91 98765 43210',
    date_of_birth: '1985-06-15',
    address: 'Andheri West, Mumbai',
    weight: 85,
    height: 180,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    qr_pass_code: 'PASS_ADMIN_IV01',
    created_at: '2025-01-15T08:00:00Z',
  },
  {
    user_id: 'usr-trainer-01',
    gym_id: 'gym-tenant-001',
    member_internal_id: 102,
    role: 'Trainer',
    full_name: 'Coach Marcus Vance',
    email: 'marcus@bodyline.com',
    phone: '+91 98111 22334',
    date_of_birth: '1990-03-22',
    address: 'Bandra, Mumbai',
    weight: 90,
    height: 185,
    avatar_url: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&q=80&w=250',
    qr_pass_code: 'PASS_TRAINER_MV01',
    created_at: '2025-02-01T09:30:00Z',
  },
  {
    user_id: 'usr-member-01',
    gym_id: 'gym-tenant-001',
    role: 'Member',
    full_name: 'Ananya Roy',
    email: 'ananya.roy@example.com',
    phone: '+91 99887 76655',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=250',
    qr_pass_code: 'PASS_MEMBER_AR01',
    assigned_trainer_id: 'usr-trainer-01',
    created_at: '2025-03-10T10:15:00Z',
  },
  {
    user_id: 'usr-member-02',
    gym_id: 'gym-tenant-001',
    member_internal_id: 103,
    role: 'Member',
    full_name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    phone: '+91 98999 88776',
    date_of_birth: '1995-11-05',
    address: 'Juhu, Mumbai',
    weight: 65,
    height: 165,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
    qr_pass_code: 'PASS_MEMBER_RM02',
    assigned_trainer_id: 'usr-trainer-01',
    created_at: '2025-04-05T11:00:00Z',
  },
  {
    user_id: 'usr-member-03',
    gym_id: 'gym-tenant-001',
    role: 'Member',
    full_name: 'Priya Sundaram',
    email: 'priya.s@example.com',
    phone: '+91 97333 44556',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250',
    qr_pass_code: 'PASS_MEMBER_EXPIRED_PS03',
    assigned_trainer_id: 'usr-trainer-01',
    created_at: '2025-01-20T14:20:00Z',
  }
];

const getFutureDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const INITIAL_MEMBERSHIPS: Membership[] = [
  {
    id: 'mship-001',
    user_id: 'usr-member-01',
    gym_id: 'gym-tenant-001',
    plan_name: 'Pro Annual Pass (All Access)',
    start_date: '2026-01-01',
    end_date: getFutureDate(3),
    amount_paid: 24999,
    payment_status: 'Paid',
    status: 'Active',
  },
  {
    id: 'mship-002',
    user_id: 'usr-member-02',
    gym_id: 'gym-tenant-001',
    plan_name: 'Quarterly Strength Pass',
    start_date: '2026-06-01',
    end_date: getFutureDate(1),
    amount_paid: 7499,
    payment_status: 'Paid',
    status: 'Active',
  },
  {
    id: 'mship-003',
    user_id: 'usr-member-03',
    gym_id: 'gym-tenant-001',
    plan_name: 'Monthly Starter',
    start_date: '2026-07-01',
    end_date: getFutureDate(-2), // Expired 2 days ago
    amount_paid: 2999,
    payment_status: 'Paid',
    status: 'Expired',
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-101',
    user_id: 'usr-member-01',
    gym_id: 'gym-tenant-001',
    user_name: 'Ananya Roy',
    check_in: new Date(Date.now() - 2 * 3600000).toISOString(),
    gate_location: 'Turnstile A1 - Main Entry',
    status: 'GRANTED'
  },
  {
    id: 'att-102',
    user_id: 'usr-member-02',
    gym_id: 'gym-tenant-001',
    user_name: 'Rohan Mehta',
    check_in: new Date(Date.now() - 5 * 3600000).toISOString(),
    gate_location: 'Turnstile A2 - VIP VIP Gate',
    status: 'GRANTED'
  },
  {
    id: 'att-103',
    user_id: 'usr-member-03',
    gym_id: 'gym-tenant-001',
    user_name: 'Priya Sundaram',
    check_in: new Date(Date.now() - 24 * 3600000).toISOString(),
    gate_location: 'Turnstile A1 - Main Entry',
    status: 'DENIED'
  }
];

export const INITIAL_WORKOUT: WorkoutPlan = {
  id: 'wk-plan-01',
  user_id: 'usr-member-01',
  gym_id: 'gym-tenant-001',
  title: 'AI High-Performance Sculpting Plan',
  summary: 'Customized hyper-trophy split targeting athletic posture, core stability, and upper body tone.',
  weeklyFrequency: 4,
  estimatedDurationMinutes: 45,
  schedule: [
    {
      dayName: 'Day 1 - Push & Core Focus',
      focus: 'Chest, Shoulders & Abs',
      warmup: ['Cat-cow stretch - 2 mins', 'Band pull-aparts - 15 reps', 'Incline treadmill walk - 5 mins'],
      exercises: [
        { name: 'Dumbbell Incline Chest Press', sets: 4, reps: '10-12', restSeconds: 60, tempo: '2-0-1-0', formTip: 'Squeeze shoulder blades together before pressing.', completed: true },
        { name: 'Standing Overhead Dumbbell Press', sets: 3, reps: '12', restSeconds: 60, tempo: '2-0-1-0', formTip: 'Engage glutes to prevent lower back arching.', completed: true },
        { name: 'Cable Tricep Rope Extension', sets: 3, reps: '15', restSeconds: 45, tempo: '2-0-1-1', formTip: 'Flare the rope outward at the bottom.', completed: false },
        { name: 'Hanging Leg Raises', sets: 3, reps: '15', restSeconds: 45, tempo: '1-0-1-0', formTip: 'Control the drop; avoid swinging.', completed: false }
      ],
      cooldown: ['Chest door-frame stretch - 2 mins', 'Child pose - 1 min']
    },
    {
      dayName: 'Day 2 - Pull & Posterior Chain',
      focus: 'Lats, Upper Back & Biceps',
      warmup: ['Scapular pull-ups - 10 reps', 'Arm circles'],
      exercises: [
        { name: 'Lat Pulldown (Neutral Grip)', sets: 4, reps: '10-12', restSeconds: 60, tempo: '2-1-1-0', formTip: 'Drive elbows down toward hip bones.', completed: false },
        { name: 'Seated Cable Row', sets: 3, reps: '12', restSeconds: 60, tempo: '2-0-1-1', formTip: 'Pause for 1 second at chest touch.', completed: false },
        { name: 'Incline Incline Dumbbell Bicep Curls', sets: 3, reps: '12-15', restSeconds: 45, tempo: '3-0-1-0', formTip: 'Keep upper arm completely perpendicular to ground.', completed: false }
      ],
      cooldown: ['Foam roll upper back - 3 mins']
    }
  ],
  nutritionAdvice: [
    'Consume 25-30g of protein within 45 mins post-workout.',
    'Hydrate with at least 3.5 Liters of water throughout the day.',
    'Incorporate complex carbohydrates before heavy training sessions.'
  ],
  assignedBy: 'Coach Marcus Vance',
  created_at: '2026-08-01T10:00:00Z'
};

export const INITIAL_BODY_METRICS: BodyProgressMetric[] = [
  { date: 'May', weightKg: 64.5, bodyFatPercent: 24.2, muscleMassKg: 26.1 },
  { date: 'Jun', weightKg: 63.8, bodyFatPercent: 23.1, muscleMassKg: 26.5 },
  { date: 'Jul', weightKg: 62.9, bodyFatPercent: 21.8, muscleMassKg: 27.2 },
  { date: 'Aug', weightKg: 61.8, bodyFatPercent: 20.4, muscleMassKg: 27.8 },
];

export const REVENUE_STATS_DATA = [
  { month: 'Jan', revenue: 420000, members: 210, checkins: 4200 },
  { month: 'Feb', revenue: 480000, members: 245, checkins: 4900 },
  { month: 'Mar', revenue: 530000, members: 270, checkins: 5400 },
  { month: 'Apr', revenue: 590000, members: 295, checkins: 6100 },
  { month: 'May', revenue: 640000, members: 320, checkins: 6800 },
  { month: 'Jun', revenue: 684000, members: 342, checkins: 7250 },
];
