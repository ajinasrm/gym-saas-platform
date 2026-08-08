import React, { useState } from 'react';
import { X, Sparkles, Dumbbell, Calendar, Target, CheckCircle2, ChevronRight } from 'lucide-react';
import { WorkoutPlan } from '../lib/types';

interface AIWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanGenerated: (newPlan: WorkoutPlan) => void;
}

export const AIWorkoutModal: React.FC<AIWorkoutModalProps> = ({
  isOpen,
  onClose,
  onPlanGenerated
}) => {
  const [goal, setGoal] = useState('Hypertrophy & Muscle Building');
  const [experience, setExperience] = useState('Intermediate');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [equipment, setEquipment] = useState('Full Gym Equipment');
  const [targetMuscles, setTargetMuscles] = useState('Full Body Split');
  const [specialNotes, setSpecialNotes] = useState('Focus on posture and shoulder stability');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const res = await fetch('/api/ai/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          experience,
          daysPerWeek,
          equipment,
          targetMuscles,
          specialNotes
        })
      });

      const data = await res.json();
      setIsGenerating(false);

      if (data.plan) {
        const generated: WorkoutPlan = {
          id: `wk_${Math.random().toString(36).substring(2, 8)}`,
          user_id: 'usr-member-01',
          gym_id: 'gym-tenant-001',
          title: data.plan.title || 'AI Personalized Hypertrophy Plan',
          summary: data.plan.summary || 'Gemini AI generated program tailored for peak strength.',
          weeklyFrequency: Number(daysPerWeek),
          estimatedDurationMinutes: data.plan.estimatedDurationMinutes || 45,
          schedule: data.plan.schedule || [],
          nutritionAdvice: data.plan.nutritionAdvice || [],
          assignedBy: 'Gemini AI Fitness Engine',
          created_at: new Date().toISOString()
        };

        onPlanGenerated(generated);
        onClose();
      }
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-4 bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-950 border-b border-indigo-500/20 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Gemini AI Workout Genius</h3>
              <p className="text-[10px] text-indigo-200">Personalized workout routines based on biomechanics</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleGenerate} className="p-5 space-y-3.5 overflow-y-auto custom-scrollbar">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Fitness Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Hypertrophy & Muscle Building">Hypertrophy & Muscle Building</option>
              <option value="Fat Loss & Lean Conditioning">Fat Loss & Lean Conditioning</option>
              <option value="Pure Strength & Powerlifting">Pure Strength & Powerlifting</option>
              <option value="Athletic Mobility & Core Stability">Athletic Mobility & Core Stability</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Experience Level</label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced Pro</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Training Days / Week</label>
              <select
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={3}>3 Days Split</option>
                <option value={4}>4 Days Split</option>
                <option value={5}>5 Days Split</option>
                <option value={6}>6 Days PPL Split</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Available Equipment</label>
            <input 
              type="text" 
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="e.g. Dumbbells, Barbell, Cables, Machines"
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Special Notes or Focus Areas</label>
            <input 
              type="text" 
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="e.g. Protect lower back, focus on lat width"
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 mt-2"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                Generating Custom Plan via Gemini AI...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Generate AI Workout Plan Now
              </span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
