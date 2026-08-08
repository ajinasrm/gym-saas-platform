import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Banknote,
  Smartphone,
  Building,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { PaymentMethod } from '../lib/types';

interface PaymentRequestModalProps {
  planName: string;
  planMonths: number;
  amount: number;
  currency?: string;
  isOpen: boolean;
  onClose: () => void;
  /** Resolves once the request has been written; rejects with a message on failure. */
  onSubmitRequest: (details: {
    method: PaymentMethod;
    reference: string;
    note: string;
  }) => Promise<void>;
  isLive: boolean;
}

const METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'Cash', label: 'Cash at counter', icon: <Banknote className="w-4 h-4" />, hint: 'Pay the front desk and the admin will confirm.' },
  { id: 'UPI', label: 'UPI transfer', icon: <Smartphone className="w-4 h-4" />, hint: 'Enter the UPI reference number below.' },
  { id: 'Bank Transfer', label: 'Bank transfer', icon: <Building className="w-4 h-4" />, hint: 'Enter the transaction/UTR number below.' },
  { id: 'Card', label: 'Card at counter', icon: <CreditCard className="w-4 h-4" />, hint: 'Enter the last 4 digits or receipt number.' },
];

export const PaymentRequestModal: React.FC<PaymentRequestModalProps> = ({
  planName,
  planMonths,
  amount,
  currency = 'INR',
  isOpen,
  onClose,
  onSubmitRequest,
  isLive,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const needsReference = method !== 'Cash';
  const selected = METHODS.find((m) => m.id === method);

  const handleSubmit = async () => {
    setError('');
    if (needsReference && !reference.trim()) {
      setError('Please enter the payment reference so the admin can verify it.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitRequest({ method, reference, note });
      setIsSubmitted(true);
    } catch (e: any) {
      setError(e?.message ?? 'Could not submit the request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setReference('');
    setNote('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 p-4 border-b border-indigo-500/20 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-400/30">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isSubmitted ? 'Request Submitted' : 'Request Membership Renewal'}
              </h3>
              <p className="text-[11px] text-slate-400">Approved by gym admin</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar">
          {!isSubmitted ? (
            <>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Plan</p>
                    <p className="font-bold text-white text-sm mt-0.5">{planName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Adds {planMonths} month{planMonths === 1 ? '' : 's'} to your membership
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Amount</p>
                    <p className="font-extrabold text-emerald-400 text-lg">
                      ₹{amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-300 mb-2">How did you pay?</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setMethod(m.id); setError(''); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      method === m.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {m.icon}
                    <span className="text-left leading-tight">{m.label}</span>
                  </button>
                ))}
              </div>

              {selected && (
                <p className="text-[11px] text-slate-500 mb-4 -mt-1">{selected.hint}</p>
              )}

              {needsReference && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Payment reference <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. UPI ref 4471xxxxxx / UTR number"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-3 text-xs focus:border-indigo-500 outline-none"
                  />
                </div>
              )}

              <div className="mb-5">
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Note for the admin <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Anything the admin should know"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-3 text-xs focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 mb-4 flex gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200 leading-relaxed">
                  This app does not process payments online. Your membership is
                  extended only after a gym admin confirms the money was received.
                </p>
              </div>

              {!isLive && (
                <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 mb-4 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-200">
                    Demo mode — no database connected, so this request will not be saved.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 mb-4 text-center">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>Send to admin for approval</>
                )}
              </button>
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center mx-auto border border-indigo-500/40">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="font-bold text-xl text-white">Sent for approval</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your request is now pending with the gym admin.
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 text-left text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Plan</span>
                  <span className="text-slate-200 font-semibold">{planName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Amount</span>
                  <span className="text-emerald-400 font-bold">₹{amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Method</span>
                  <span className="text-slate-200">{method}</span>
                </div>
                {reference && (
                  <div className="flex justify-between text-slate-400">
                    <span>Reference</span>
                    <span className="text-slate-200 font-mono">{reference}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 pt-1.5 border-t border-slate-800">
                  <span>Status</span>
                  <span className="text-amber-400 font-bold">Pending approval</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Your membership dates will update once the admin approves it.
              </p>

              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
