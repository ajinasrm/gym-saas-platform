import React, { useState } from 'react';
import { 
  QrCode, 
  Flame, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  Dumbbell, 
  CreditCard, 
  Sparkles,
  Timer,
  Info,
  Utensils,
  Plus,
  ShoppingBag,
  Droplets,
  Layers,
  ChevronRight,
  MessageCircle,
  Scale
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { User, Membership, WorkoutPlan, BodyProgressMetric, Tenant, Exercise, GymClass, ClassBooking, SupplementProduct, DailyNutritionSummary, MealItem } from '../../lib/types';
import { RestTimerModal } from '../RestTimerModal';
import { ClassBookingModal } from '../ClassBookingModal';
import { SupplementStoreModal } from '../SupplementStoreModal';
import { ExerciseDetailModal } from '../ExerciseDetailModal';
import { INITIAL_CLASSES, INITIAL_PRODUCTS, INITIAL_NUTRITION } from '../../lib/mockData';

const RENEWAL_PLANS = {
  '1 Month': { duration: 1, price: 899 },
  '3 Months': { duration: 3, price: 2499 },
  '6 Months': { duration: 6, price: 4799 },
  '9 Months': { duration: 9, price: 7199 },
  '12 Months': { duration: 12, price: 8999 }
} as const;

interface MemberDashboardProps {
  user: User;
  membership?: Membership;
  tenant: Tenant;
  workoutPlan: WorkoutPlan;
  bodyMetrics: BodyProgressMetric[];
  onOpenQRPass: () => void;
  onOpenPaymentModal: (planName: string, amount: number) => void;
  onOpenAIWorkoutModal: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  user,
  membership,
  tenant,
  workoutPlan,
  bodyMetrics,
  onOpenQRPass,
  onOpenPaymentModal,
  onOpenAIWorkoutModal
}) => {
  const [activeTab, setActiveTab] = useState<'workout' | 'diet' | 'classes' | 'store' | 'membership'>('workout');
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>(workoutPlan.schedule[0]?.exercises || []);
  const [localBodyMetrics, setLocalBodyMetrics] = useState<BodyProgressMetric[]>(bodyMetrics);
  const [selectedRenewalPlan, setSelectedRenewalPlan] = useState<keyof typeof RENEWAL_PLANS>('3 Months');

  // Modals state
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<Exercise | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isMessageAdminOpen, setIsMessageAdminOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  
  // Body Metrics form
  const [showMetricsForm, setShowMetricsForm] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newHeight, setNewHeight] = useState('');

  // Dynamic state for classes, nutrition, water intake
  const [gymClasses, setGymClasses] = useState<GymClass[]>(INITIAL_CLASSES);
  const [userBookings, setUserBookings] = useState<ClassBooking[]>([
    {
      id: 'bk-1',
      class_id: 'cls-101',
      user_id: user.user_id,
      class_title: 'CrossFit Shred & Power',
      time: '07:00 AM - 08:00 AM',
      day: 'Today',
      status: 'CONFIRMED',
      booked_at: new Date().toISOString()
    }
  ]);

  const [nutrition, setNutrition] = useState<DailyNutritionSummary>(INITIAL_NUTRITION);
  const [waterCount, setWaterCount] = useState(6);

  // New meal form state
  const [newMealName, setNewMealName] = useState('');
  const [newMealCalories, setNewMealCalories] = useState('');
  const [newMealProtein, setNewMealProtein] = useState('');
  const [newMealType, setNewMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Post-Workout'>('Post-Workout');
  const [showAddMealForm, setShowAddMealForm] = useState(false);

  const toggleExercise = (index: number) => {
    const updated = [...exercises];
    updated[index].completed = !updated[index].completed;
    setExercises(updated);
  };

  const handleOpenTimer = (sec: number) => {
    setTimerSeconds(sec);
    setIsTimerOpen(true);
  };

  const handleBookClass = (cls: GymClass) => {
    // Add booking and update count
    const newBooking: ClassBooking = {
      id: `bk-${Date.now()}`,
      class_id: cls.id,
      user_id: user.user_id,
      class_title: cls.title,
      time: cls.time,
      day: cls.day,
      status: 'CONFIRMED',
      booked_at: new Date().toISOString()
    };
    setUserBookings((prev) => [...prev, newBooking]);
    setGymClasses((prev) =>
      prev.map((c) => (c.id === cls.id ? { ...c, bookedCount: c.bookedCount + 1 } : c))
    );
  };

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName || !newMealCalories) return;
    const meal: MealItem = {
      id: `meal-${Date.now()}`,
      name: newMealName,
      mealType: newMealType,
      calories: Number(newMealCalories) || 300,
      proteinGrams: Number(newMealProtein) || 20,
      carbsGrams: 30,
      fatGrams: 8,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNutrition((prev) => ({
      ...prev,
      meals: [...prev.meals, meal]
    }));
    setNewMealName('');
    setNewMealCalories('');
    setNewMealProtein('');
    setShowAddMealForm(false);
  };

  const handleUpdateMetrics = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;
    const newMetric: BodyProgressMetric = {
      date: new Date().toISOString().split('T')[0],
      weightKg: Number(newWeight),
      bodyFatPercent: localBodyMetrics.length > 0 ? localBodyMetrics[localBodyMetrics.length - 1].bodyFatPercent : 15,
      muscleMassKg: localBodyMetrics.length > 0 ? localBodyMetrics[localBodyMetrics.length - 1].muscleMassKg : 35
    };
    setLocalBodyMetrics([...localBodyMetrics, newMetric]);
    setNewWeight('');
    setNewHeight('');
    setShowMetricsForm(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if(!messageText) return;
    // Simulate sending message
    setTimeout(() => {
      alert("Message sent to Admin successfully!");
      setIsMessageAdminOpen(false);
      setMessageText('');
    }, 500);
  };

  const completedCount = exercises.filter((e) => e.completed).length;
  const progressPercent = Math.round((completedCount / (exercises.length || 1)) * 100);

  const totalCaloriesConsumed = nutrition.meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProteinConsumed = nutrition.meals.reduce((sum, m) => sum + m.proteinGrams, 0);

  // Membership Expiry Calculation
  const daysLeft = membership?.end_date 
    ? Math.ceil((new Date(membership.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : -1;

  return (
    <div className="p-4 space-y-4 text-slate-100 pb-16 max-w-5xl mx-auto">
      {/* EXPIRY ALERT BANNER */}
      {daysLeft >= 0 && daysLeft <= 3 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
               <Info className="w-5 h-5" />
             </div>
             <div>
               <h3 className="font-bold text-red-400 text-sm">Action Required</h3>
               <p className="text-xs text-red-400/80">Your membership expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}. Renew now to maintain access.</p>
             </div>
          </div>
          <button 
             onClick={() => { setActiveTab('membership'); }}
             className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Renew
          </button>
        </div>
      )}

      {/* MEMBER HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/90 p-4 rounded-3xl border border-slate-800 gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <img 
            src={user.avatar_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150'} 
            alt={user.full_name} 
            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/60"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-slate-100">Welcome, {user.full_name} 👋</h2>
              <span className="px-2.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold rounded-full border border-emerald-500/30">
                PRO MEMBER
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">{tenant.name} • {tenant.address}</p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 text-xs font-bold shadow-sm">
            <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>12 Day Streak</span>
          </div>

          <button
            onClick={() => setIsMessageAdminOpen(true)}
            className="px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold text-xs rounded-2xl flex items-center gap-1.5 shadow-lg shadow-indigo-500/10 transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Support</span>
          </button>

          <button
            onClick={onOpenQRPass}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-2xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            <span>Gate QR</span>
          </button>
        </div>
      </div>

      {/* SUB-NAVIGATION TAB BAR */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
        {[
          { id: 'workout', label: 'Workout & Progress', icon: Dumbbell },
          { id: 'diet', label: 'Diet & Macros', icon: Utensils },
          { id: 'classes', label: 'Studio Classes', icon: Calendar },
          { id: 'store', label: 'Gear & Supplements', icon: ShoppingBag },
          { id: 'membership', label: 'Pass & Billing', icon: CreditCard },
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
            </button>
          );
        })}
      </div>

      {/* TAB 1: WORKOUT & PROGRESS */}
      {activeTab === 'workout' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Today's Workout Card */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Today's Hypertrophy Routine</h3>
                  <p className="text-xs text-slate-400">Assigned by {workoutPlan.assignedBy}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenTimer(60)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Timer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Rest Timer</span>
                </button>

                <button 
                  onClick={onOpenAIWorkoutModal}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI Regenerate</span>
                </button>
              </div>
            </div>

            {/* Workout Day selector & Progress */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 text-sm">
                  {workoutPlan.schedule[activeDayIndex]?.dayName || 'Day 1 - Push Focus'}
                </span>
                <span className="text-slate-400 font-semibold">
                  {completedCount} / {exercises.length} Completed ({progressPercent}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Exercises Interactive List */}
            <div className="space-y-2.5">
              {exercises.map((ex, idx) => (
                <div 
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    ex.completed 
                      ? 'bg-emerald-950/20 border-emerald-800/60 text-slate-400' 
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div 
                    onClick={() => toggleExercise(idx)}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    {ex.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <p className={`text-xs font-bold ${ex.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                        {ex.name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {ex.sets} Sets × {ex.reps} Reps • {ex.restSeconds}s Rest Interval
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenTimer(ex.restSeconds || 60)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Start rest timer for this exercise"
                    >
                      <Timer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setSelectedExerciseForDetail(ex)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="View technique guide"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Body Metrics Chart */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-100">Weight & Body Composition Log</h3>
              </div>
              <button onClick={() => setShowMetricsForm(!showMetricsForm)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" /> Log Metrics
              </button>
            </div>

            {showMetricsForm && (
              <form onSubmit={handleUpdateMetrics} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 mt-3">
                <h4 className="text-xs font-bold text-slate-200">Update Current Metrics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Weight (kg)"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Height (cm)"
                    value={newHeight}
                    onChange={(e) => setNewHeight(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">Save Metrics</button>
              </form>
            )}

            <div className="h-44 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={localBodyMetrics}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Line type="monotone" dataKey="weightKg" stroke="#34d399" strokeWidth={2.5} dot={{ r: 4 }} name="Weight (kg)" />
                  <Line type="monotone" dataKey="muscleMassKg" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} name="Muscle (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIET & MACROS */}
      {activeTab === 'diet' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Daily Macros Target Summary */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Nutrition & Macros Tracker</h3>
                  <p className="text-xs text-slate-400">Daily Caloric Target: {nutrition.targetCalories} kcal</p>
                </div>
              </div>

              <button
                onClick={() => setShowAddMealForm(!showAddMealForm)}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
              >
                <Plus className="w-4 h-4" /> Log Meal
              </button>
            </div>

            {/* Calories Progress Meter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 font-medium">Calories Consumed</span>
                  <span className="font-bold text-emerald-400">{totalCaloriesConsumed} / {nutrition.targetCalories} kcal</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${Math.min(100, (totalCaloriesConsumed / nutrition.targetCalories) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 font-medium">Protein Consumed</span>
                  <span className="font-bold text-indigo-400">{totalProteinConsumed} / {nutrition.targetProteinGrams}g</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all"
                    style={{ width: `${Math.min(100, (totalProteinConsumed / nutrition.targetProteinGrams) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Add Meal Inline Form */}
            {showAddMealForm && (
              <form onSubmit={handleAddMeal} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200">Add New Meal Entry</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Meal Name (e.g. Eggs & Toast)"
                    value={newMealName}
                    onChange={(e) => setNewMealName(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Calories (kcal)"
                    value={newMealCalories}
                    onChange={(e) => setNewMealCalories(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Protein (grams)"
                    value={newMealProtein}
                    onChange={(e) => setNewMealProtein(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Save Meal
                </button>
              </form>
            )}

            {/* Logged Meals List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Meals</h4>
              {nutrition.meals.map((meal) => (
                <div key={meal.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded mr-2">
                      {meal.mealType}
                    </span>
                    <span className="font-bold text-slate-200">{meal.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400">{meal.calories} kcal</span>
                    <span className="text-slate-400 text-[11px] block">{meal.proteinGrams}g Protein</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Water Tracker */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Daily Water Intake</h4>
                <p className="text-xs text-slate-400">{waterCount} of 8 Glasses logged</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setWaterCount(Math.max(0, waterCount - 1))}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
              >
                -
              </button>
              <span className="text-base font-extrabold text-cyan-400 w-6 text-center">{waterCount}</span>
              <button
                onClick={() => setWaterCount(waterCount + 1)}
                className="w-8 h-8 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STUDIO CLASSES */}
      {activeTab === 'classes' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-100">Live Group Training & Yoga</h3>
                <p className="text-xs text-slate-400">Book your spot in studio classes</p>
              </div>
              <button
                onClick={() => setIsClassModalOpen(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Calendar className="w-4 h-4" /> Browse Schedule
              </button>
            </div>

            {/* Booked list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Confirmed Classes</h4>
              {userBookings.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No upcoming studio classes booked.</div>
              ) : (
                userBookings.map((bk) => (
                  <div key={bk.id} className="p-4 bg-slate-950 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-100">{bk.class_title}</h4>
                        <p className="text-xs text-slate-400">{bk.time} • {bk.day}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                      Confirmed
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GEAR & SUPPLEMENTS */}
      {activeTab === 'store' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-lg text-center py-10">
            <ShoppingBag className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-bold text-slate-100">Body Line Official Store</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Get authentic supplements, whey isolate, creatine, leather belts, and compression apparel directly from your gym counter.
            </p>
            <button
              onClick={() => setIsStoreModalOpen(true)}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              Open Supplement Store
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: PASS & BILLING */}
      {activeTab === 'membership' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 rounded-3xl border border-indigo-500/30 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Membership Tier</span>
                <h3 className="text-2xl font-extrabold text-white">{membership?.plan_name || 'Pro Annual Pass'}</h3>
              </div>
              <span className="px-3 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-indigo-500/20">
              <div>
                <span className="text-slate-400">Valid Until</span>
                <p className="font-bold text-slate-200">{membership?.end_date || '2026-12-31'}</p>
              </div>
              <div>
                <span className="text-slate-400">Amount Paid</span>
                <p className="font-bold text-emerald-400">₹{membership?.amount_paid?.toLocaleString('en-IN') || '24,999'}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-indigo-500/20 space-y-3">
              <span className="text-xs font-bold text-slate-300">Select Renewal Plan</span>
              <select
                value={selectedRenewalPlan}
                onChange={(e: any) => setSelectedRenewalPlan(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 px-3 py-3 rounded-xl text-xs text-white font-bold focus:border-indigo-500 outline-none"
              >
                {Object.entries(RENEWAL_PLANS).map(([planName, details]) => (
                  <option key={planName} value={planName}>{planName} - ₹{details.price.toLocaleString('en-IN')}</option>
                ))}
              </select>
              
              <button
                onClick={() => onOpenPaymentModal(`Pro Pass (${selectedRenewalPlan})`, RENEWAL_PLANS[selectedRenewalPlan].price)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <CreditCard className="w-4 h-4" /> Pay & Renew Membership
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <RestTimerModal
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        initialSeconds={timerSeconds}
      />

      <ExerciseDetailModal
        exercise={selectedExerciseForDetail}
        onClose={() => setSelectedExerciseForDetail(null)}
        onToggleComplete={() => {
          if (selectedExerciseForDetail) {
            const idx = exercises.findIndex((e) => e.name === selectedExerciseForDetail.name);
            if (idx !== -1) toggleExercise(idx);
          }
        }}
      />

      <ClassBookingModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        classes={gymClasses}
        onBookClass={handleBookClass}
        userBookings={userBookings}
      />

      <SupplementStoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        products={INITIAL_PRODUCTS}
      />

      {/* Message Admin Modal */}
      {isMessageAdminOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm relative">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-indigo-400" /> Message Admin
            </h2>
            <p className="text-xs text-slate-400 mb-4">Send a support request or feedback directly to the gym administration.</p>
            
            <form onSubmit={handleSendMessage}>
              <textarea 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 mb-4"
                rows={4}
                placeholder="How can we help you today?"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                required
              ></textarea>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsMessageAdminOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700"
                >Cancel</button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-600"
                >Send Message</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
