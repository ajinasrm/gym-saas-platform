import React from 'react';
import { Exercise } from '../lib/types';
import { X, Flame, ShieldAlert, CheckCircle2, Dumbbell, Timer } from 'lucide-react';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  onClose: () => void;
  onToggleComplete?: () => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  onClose,
  onToggleComplete,
}) => {
  if (!exercise) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-white relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Exercise Technique & Form Guide
            </span>
            <h3 className="text-xl font-extrabold text-slate-100">{exercise.name}</h3>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 bg-slate-850/80 p-3.5 rounded-2xl border border-slate-800 text-center">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Sets</span>
            <p className="text-lg font-extrabold text-slate-100">{exercise.sets}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Reps Target</span>
            <p className="text-lg font-extrabold text-slate-100">{exercise.reps}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Rest Time</span>
            <p className="text-lg font-extrabold text-emerald-400 flex items-center justify-center gap-1">
              <Timer className="w-4 h-4" /> {exercise.restSeconds}s
            </p>
          </div>
        </div>

        {/* Form Coach Tip */}
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200/90 flex gap-3 items-start">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-300 mb-1">Coach Technique Tip</h4>
            <p>{exercise.formTip || 'Maintain tight core engagement and control the eccentric movement phase.'}</p>
          </div>
        </div>

        {/* Tempo Breakdown */}
        {exercise.tempo && (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-emerald-400" /> Tempo Standard: <span className="text-emerald-400 font-mono">{exercise.tempo}</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              (2s Eccentric Lowering • 0s Bottom Pause • 1s Explosive Lift • 0s Top Squeeze)
            </p>
          </div>
        )}

        {/* Complete Toggle */}
        <div className="pt-2 flex gap-3">
          {onToggleComplete && (
            <button
              onClick={() => {
                onToggleComplete();
                onClose();
              }}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                exercise.completed
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {exercise.completed ? 'Mark as Incomplete' : 'Complete Exercise Set'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
