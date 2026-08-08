import React, { useState } from 'react';
import { 
  UserCheck, 
  Dumbbell, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Apple, 
  MessageSquare,
  Send,
  Timer
} from 'lucide-react';
import { User, WorkoutPlan, Tenant, Exercise } from '../../lib/types';

interface TrainerDashboardProps {
  trainer: User;
  tenant: Tenant;
  assignedClients: User[];
  workoutPlan: WorkoutPlan;
  onOpenAIWorkoutModal: () => void;
}

export const TrainerDashboard: React.FC<TrainerDashboardProps> = ({
  trainer,
  tenant,
  assignedClients,
  workoutPlan,
  onOpenAIWorkoutModal
}) => {
  const [selectedClient, setSelectedClient] = useState<User | null>(assignedClients[0] || null);
  const [exercisesList, setExercisesList] = useState<Exercise[]>(workoutPlan.schedule[0]?.exercises || []);
  
  // Custom exercise inline form state
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState(3);
  const [exReps, setExReps] = useState('12');
  const [exTip, setExTip] = useState('');

  // Coaching note state
  const [coachingNote, setCoachingNote] = useState('');
  const [noteSent, setNoteSent] = useState(false);

  const handleAddExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exName) return;
    const newEx: Exercise = {
      name: exName,
      sets: exSets,
      reps: exReps,
      restSeconds: 60,
      formTip: exTip || 'Ensure controlled rep speed and proper core bracing.',
      completed: false
    };
    setExercisesList((prev) => [...prev, newEx]);
    setExName('');
    setExTip('');
    setShowAddExercise(false);
  };

  const handleSendNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachingNote) return;
    setNoteSent(true);
    setTimeout(() => {
      setNoteSent(false);
      setCoachingNote('');
    }, 2000);
  };

  return (
    <div className="p-4 space-y-4 text-slate-100 pb-16 max-w-5xl mx-auto">
      
      {/* TRAINER HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900/90 p-4 rounded-3xl border border-slate-800 gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <img 
            src={trainer.avatar_url || 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&q=80&w=150'} 
            alt={trainer.full_name} 
            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/60"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-slate-100">{trainer.full_name}</h2>
              <span className="px-2.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold rounded-full border border-emerald-500/30">
                HEAD TRAINER
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">{tenant.name}</p>
          </div>
        </div>

        <button
          onClick={onOpenAIWorkoutModal}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-slate-950 fill-current" />
          <span>AI Plan Studio</span>
        </button>
      </div>

      {/* ASSIGNED CLIENTS LIST */}
      <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-100">Personal Training Roster</h3>
          <span className="text-xs text-emerald-400 font-bold">{assignedClients.length} Active Clients</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {assignedClients.map(client => (
            <div 
              key={client.user_id}
              onClick={() => setSelectedClient(client)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedClient?.user_id === client.user_id 
                  ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30' 
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <img 
                  src={client.avatar_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150'} 
                  alt={client.full_name} 
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div className="overflow-hidden">
                  <p className="font-bold text-xs text-slate-100 truncate">{client.full_name}</p>
                  <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">92% Weekly Compliance</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CLIENT SELECTED DETAILS & WORKOUT PLAN */}
      {selectedClient && (
        <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Active PT Member</span>
              <h3 className="font-bold text-lg text-white">{selectedClient.full_name}</h3>
            </div>

            <button
              onClick={() => setShowAddExercise(!showAddExercise)}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Exercise</span>
            </button>
          </div>

          {/* Inline Add Exercise Form */}
          {showAddExercise && (
            <form onSubmit={handleAddExerciseSubmit} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400">Custom Exercise Assignment</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Exercise Name (e.g. Incline DB Flyes)"
                  value={exName}
                  onChange={(e) => setExName(e.target.value)}
                  className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                  required
                />
                <input
                  type="number"
                  placeholder="Sets (e.g. 4)"
                  value={exSets}
                  onChange={(e) => setExSets(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Reps Target (e.g. 10-12)"
                  value={exReps}
                  onChange={(e) => setExReps(e.target.value)}
                  className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                />
              </div>
              <input
                type="text"
                placeholder="Coach Form Cue or Tip"
                value={exTip}
                onChange={(e) => setExTip(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
              >
                Assign to Client Routine
              </button>
            </form>
          )}

          {/* Today's Exercises for Client */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Assigned Exercises:</p>
            {exercisesList.map((ex, idx) => (
              <div key={idx} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-100">{ex.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{ex.sets} Sets × {ex.reps} Reps • {ex.formTip}</p>
                </div>
                {ex.completed ? (
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 font-bold rounded-full text-[10px]">Done</span>
                ) : (
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-400 font-bold rounded-full text-[10px]">Assigned</span>
                )}
              </div>
            ))}
          </div>

          {/* Send Coaching Note */}
          <form onSubmit={handleSendNote} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-400" /> Send Coach Feedback
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Focus on deep elbow flexion during pulldowns today!"
                value={coachingNote}
                onChange={(e) => setCoachingNote(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </div>
            {noteSent && <p className="text-xs text-emerald-400 font-bold animate-pulse">Feedback dispatched to member app!</p>}
          </form>
        </div>
      )}

    </div>
  );
};
