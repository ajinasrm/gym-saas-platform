import React, { useState } from 'react';
import { X, QrCode, Camera, Lock, Unlock } from 'lucide-react';
import { User, Tenant } from '../lib/types';
import { findUserByPassCode, fetchActiveMembership, describeDbError } from '../lib/db';

const GATE = 'Turnstile Gate 1 - Main Entry';

interface QRScannerModalProps {
  user: User;
  tenant: Tenant;
  isOpen: boolean;
  onClose: () => void;
  onCheckInRecorded: (member: User, isGranted: boolean, gate: string) => void;
  isLive: boolean;
}

interface ScanResult {
  success: boolean;
  message: string;
  detail?: string;
  memberName?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  user,
  tenant,
  isOpen,
  onClose,
  onCheckInRecorded,
  isLive,
}) => {
  const [activeTab, setActiveTab] = useState<'MY_PASS' | 'SCANNER'>('MY_PASS');
  const [scannedCodeInput, setScannedCodeInput] = useState(user.qr_pass_code ?? '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  if (!isOpen) return null;

  /**
   * Verifies a pass against the database: the code must belong to a member of
   * this gym, and that member must hold a membership that has not expired.
   *
   * v1 posted to /api/attendance/checkin, which granted access to any string
   * that did not contain the literal word "EXPIRED" and never consulted the
   * database or wrote a check-in record.
   */
  const handleVerifyScan = async (codeToTest: string) => {
    const code = (codeToTest || '').trim();
    setIsVerifying(true);
    setScanResult(null);

    try {
      if (!code) {
        setScanResult({ success: false, message: 'ACCESS DENIED', detail: 'No pass code supplied.' });
        return;
      }

      if (!isLive) {
        const granted = code === user.qr_pass_code;
        setScanResult({
          success: granted,
          message: granted ? 'ACCESS GRANTED (DEMO)' : 'ACCESS DENIED (DEMO)',
          detail: granted ? GATE : 'Pass code not recognised in demo data.',
          memberName: granted ? user.full_name : undefined,
        });
        onCheckInRecorded(user, granted, GATE);
        return;
      }

      const member = await findUserByPassCode(tenant.gym_id, code);
      if (!member) {
        setScanResult({
          success: false,
          message: 'ACCESS DENIED',
          detail: 'Pass code not registered at this gym.',
        });
        return;
      }

      const membership = await fetchActiveMembership(member.user_id);
      const expired =
        !membership ||
        membership.status !== 'Active' ||
        new Date(membership.end_date) < new Date(new Date().toDateString());

      if (expired) {
        setScanResult({
          success: false,
          message: 'ACCESS DENIED',
          detail: membership
            ? `Membership ended ${membership.end_date}. Please renew at the front desk.`
            : 'No membership on file for this member.',
          memberName: member.full_name,
        });
        onCheckInRecorded(member, false, GATE);
        return;
      }

      setScanResult({
        success: true,
        message: 'ACCESS GRANTED - TURNSTILE UNLOCKED',
        detail: `${GATE} • valid until ${membership.end_date}`,
        memberName: member.full_name,
      });
      onCheckInRecorded(member, true, GATE);
    } catch (e) {
      console.error(e);
      setScanResult({ success: false, message: 'SCAN FAILED', detail: describeDbError(e) });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">{tenant.name} Gate Pass</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex bg-slate-950 p-1 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('MY_PASS')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'MY_PASS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Digital Pass QR
          </button>
          <button
            onClick={() => setActiveTab('SCANNER')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'SCANNER' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Turnstile Gate Scanner
          </button>
        </div>

        {/* TAB 1: MY PASS */}
        {activeTab === 'MY_PASS' && (
          <div className="p-6 text-center space-y-4">
            <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl border-4 border-indigo-500/40 relative">
              {/* Simulated QR Visual */}
              <div className="w-44 h-44 bg-slate-900 rounded-xl flex flex-col items-center justify-center p-3 text-indigo-400 space-y-2">
                <QrCode className="w-24 h-24 stroke-[1.5]" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-white bg-indigo-600/80 px-2 py-0.5 rounded">
                  {user.qr_pass_code}
                </span>
              </div>
            </div>

            <div>
              <p className="font-bold text-base text-white">{user.full_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{tenant.name} • Active Pass</p>
            </div>

            <button
              onClick={() => {
                setActiveTab('SCANNER');
                handleVerifyScan(user.qr_pass_code);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Test Turnstile Access Scan</span>
            </button>
          </div>
        )}

        {/* TAB 2: TURNSTILE GATE SCANNER */}
        {activeTab === 'SCANNER' && (
          <div className="p-5 space-y-4">
            <div className="relative aspect-square w-full bg-slate-950 rounded-2xl border-2 border-dashed border-indigo-500/50 overflow-hidden flex flex-col items-center justify-center p-4 text-center">
              
              {/* Camera Scanner Animation Line */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse top-1/2"></div>

              <Camera className="w-10 h-10 text-indigo-400 mb-2 opacity-60" />
              <p className="text-xs text-slate-300 font-semibold">Position Member QR Code inside viewfinder</p>
              <p className="text-[10px] text-slate-500 mt-1">Or paste a member's pass code below</p>
            </div>

            {/* Test Controls */}
            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 font-medium">Test QR Pass Code:</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={scannedCodeInput}
                  onChange={(e) => setScannedCodeInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleVerifyScan(scannedCodeInput)}
                  disabled={isVerifying}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow"
                >
                  {isVerifying ? 'Verifying...' : 'Verify Pass'}
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setScannedCodeInput(user.qr_pass_code);
                    handleVerifyScan(user.qr_pass_code);
                  }}
                  className="text-[10px] text-indigo-400 font-semibold hover:underline"
                >
                  ⚡ Test Valid Pass
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => {
                    const unknown = 'PASS-UNKNOWN-000';
                    setScannedCodeInput(unknown);
                    handleVerifyScan(unknown);
                  }}
                  className="text-[10px] text-rose-400 font-semibold hover:underline"
                >
                  ❌ Test Unknown Pass
                </button>
              </div>
            </div>

            {/* Scan Result Output */}
            {scanResult && (
              <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                scanResult.success 
                  ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200' 
                  : 'bg-rose-950/80 border-rose-500/80 text-rose-200'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {scanResult.success ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-rose-400" />}
                  <span>{scanResult.message}</span>
                </div>
                {scanResult.memberName && (
                  <p className="text-[11px] font-semibold opacity-90">{scanResult.memberName}</p>
                )}
                {scanResult.detail && <p className="text-[10px] opacity-80">{scanResult.detail}</p>}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
