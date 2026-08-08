import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { PaymentRequest } from '../lib/types';

interface PaymentApprovalsPanelProps {
  payments: PaymentRequest[];
  onApprove: (paymentId: string, note: string) => Promise<void>;
  onReject: (paymentId: string, note: string) => Promise<void>;
  isLive: boolean;
}

export const PaymentApprovalsPanel: React.FC<PaymentApprovalsPanelProps> = ({
  payments,
  onApprove,
  onReject,
  isLive,
}) => {
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const pending = payments.filter((p) => p.status === 'PENDING');
  const visible = payments.filter((p) => p.status === filter);

  const pendingValue = pending.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const act = async (
    p: PaymentRequest,
    fn: (id: string, note: string) => Promise<void>,
    verb: string,
  ) => {
    if (!isLive) {
      setError('Demo mode — connect Supabase to approve payments.');
      return;
    }
    if (verb === 'reject' && !confirm(`Reject ${p.user_name}'s ₹${p.amount} request?`)) return;

    setError('');
    setBusyId(p.id);
    try {
      await fn(p.id, noteFor[p.id] ?? '');
      setNoteFor((n) => ({ ...n, [p.id]: '' }));
    } catch (e: any) {
      setError(e?.message ?? `Could not ${verb} the request.`);
    } finally {
      setBusyId(null);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Awaiting Approval</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-extrabold text-white">{pending.length}</p>
          <p className="text-[10px] text-amber-400 font-medium mt-1">Needs your review</p>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Pending Value</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-extrabold text-white">
            ₹{pendingValue.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 font-medium mt-1">Uncollected on record</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              filter === f
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
            {f === 'PENDING' && pending.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded-full text-[9px]">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 text-center">
          <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">
            No {filter.toLowerCase()} payment requests.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((p) => (
            <div
              key={p.id}
              className={`bg-slate-900 border rounded-2xl p-4 ${
                p.status === 'PENDING' ? 'border-amber-500/30' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-white truncate">{p.user_name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {p.plan_name} · {p.plan_months} month{p.plan_months === 1 ? '' : 's'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[10px] text-slate-500">
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-semibold">
                      {p.method}
                    </span>
                    {p.reference && (
                      <span className="font-mono text-slate-400">Ref {p.reference}</span>
                    )}
                    <span>Requested {fmtDate(p.created_at)}</span>
                  </div>
                  {p.member_note && (
                    <p className="text-[11px] text-slate-400 mt-1.5 italic">“{p.member_note}”</p>
                  )}
                  {p.admin_note && p.status !== 'PENDING' && (
                    <p className="text-[11px] text-slate-500 mt-1.5">Admin note: {p.admin_note}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="font-extrabold text-emerald-400 text-base">
                    ₹{Number(p.amount).toLocaleString('en-IN')}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      p.status === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : p.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </div>

              {p.status === 'PENDING' && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                  <input
                    type="text"
                    value={noteFor[p.id] ?? ''}
                    onChange={(e) => setNoteFor((n) => ({ ...n, [p.id]: e.target.value }))}
                    placeholder="Optional note (e.g. receipt no. 4471, or reason for rejecting)"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2 px-3 text-[11px] focus:border-indigo-500 outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(p, onApprove, 'approve')}
                      disabled={busyId === p.id}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      {busyId === p.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Approve &amp; extend membership
                    </button>
                    <button
                      onClick={() => act(p, onReject, 'reject')}
                      disabled={busyId === p.id}
                      className="px-4 py-2 bg-slate-800 hover:bg-rose-600 disabled:opacity-60 text-slate-300 hover:text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-600 text-center pt-1">
        Approving extends the member's end date by the plan length. Renewing early
        adds to the remaining days rather than replacing them.
      </p>
    </div>
  );
};
