import React, { useState } from 'react';
import { GymClass, ClassBooking } from '../lib/types';
import { Calendar, Clock, MapPin, User, CheckCircle2, Sparkles, X } from 'lucide-react';

interface ClassBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: GymClass[];
  onBookClass: (cls: GymClass) => void;
  userBookings: ClassBooking[];
}

export const ClassBookingModal: React.FC<ClassBookingModalProps> = ({
  isOpen,
  onClose,
  classes,
  onBookClass,
  userBookings,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  const categories = ['ALL', 'CrossFit', 'Yoga', 'Spinning', 'Strength'];
  const filteredClasses = selectedCategory === 'ALL'
    ? classes
    : classes.filter((c) => c.category === selectedCategory);

  const isBooked = (classId: string) =>
    userBookings.some((b) => b.class_id === classId && b.status === 'CONFIRMED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Group Training & Yoga
              </span>
            </div>
            <h2 className="text-xl font-bold mt-1 text-slate-100">Book Live Studio Classes</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredClasses.map((cls) => {
            const booked = isBooked(cls.id);
            const spotsRemaining = cls.maxCapacity - cls.bookedCount;

            return (
              <div
                key={cls.id}
                className={`rounded-2xl border transition-all p-4 flex flex-col md:flex-row gap-4 items-start md:items-center ${
                  booked
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                {cls.imageUrl && (
                  <img
                    src={cls.imageUrl}
                    alt={cls.title}
                    className="w-full md:w-32 h-24 object-cover rounded-xl border border-slate-700/50"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-slate-700 text-emerald-400">
                      {cls.category}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {cls.time} ({cls.day})
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-100">{cls.title}</h4>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {cls.instructor_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {cls.room}
                    </span>
                    <span className={`font-medium ${spotsRemaining <= 3 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {spotsRemaining} slots left
                    </span>
                  </div>
                </div>

                <div className="w-full md:w-auto">
                  {booked ? (
                    <div className="px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Booked & Confirmed
                    </div>
                  ) : (
                    <button
                      disabled={spotsRemaining <= 0}
                      onClick={() => onBookClass(cls)}
                      className={`w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 ${
                        spotsRemaining <= 0
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" /> Book Slot
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
