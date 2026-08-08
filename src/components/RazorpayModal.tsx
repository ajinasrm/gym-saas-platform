import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  Smartphone, 
  Building, 
  CheckCircle2, 
  Download, 
  Lock,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RazorpayModalProps {
  planName: string;
  amount: number;
  currency?: string;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (transactionId: string) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  planName,
  amount,
  currency = 'INR',
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const [method, setMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState('user@okaxis');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');

  if (!isOpen) return null;

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      // Call Express server Razorpay endpoints
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, planName })
      });
      const orderData = await res.json();

      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          razorpay_order_id: orderData.orderId, 
          amount,
          planName 
        })
      });
      const verifyData = await verifyRes.json();

      setIsProcessing(false);
      setIsSuccess(true);
      setTransactionId(verifyData.transactionId || `pay_${Math.random().toString(36).substring(2, 10)}`);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      onPaymentSuccess(verifyData.transactionId);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 border-b border-indigo-500/20 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-400/30">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">Razorpay Checkout</span>
                <span className="px-1.5 py-0.5 text-[9px] bg-blue-500/20 text-blue-300 font-bold rounded">256-bit SSL</span>
              </div>
              <p className="text-[11px] text-blue-200">{planName}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5 space-y-4">
          {!isSuccess ? (
            <>
              {/* Amount Display */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-center space-y-1">
                <span className="text-xs text-slate-400">Total Payable Amount</span>
                <p className="text-3xl font-extrabold text-white">₹{amount.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-emerald-400 font-medium">Includes All Taxes & Instant Access Pass</p>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-300">Select Payment Method</p>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setMethod('UPI')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      method === 'UPI' 
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-[11px]">UPI / GPay</span>
                  </button>

                  <button
                    onClick={() => setMethod('CARD')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      method === 'CARD' 
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-[11px]">Card</span>
                  </button>

                  <button
                    onClick={() => setMethod('NETBANKING')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      method === 'NETBANKING' 
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Building className="w-5 h-5" />
                    <span className="text-[11px]">Netbanking</span>
                  </button>
                </div>
              </div>

              {/* Input details based on method */}
              {method === 'UPI' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Enter Virtual Payment Address (VPA)</label>
                  <input 
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="username@upi"
                  />
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded font-bold text-slate-300">GPay</span>
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded font-bold text-slate-300">PhonePe</span>
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded font-bold text-slate-300">Paytm</span>
                  </div>
                </div>
              )}

              {/* Pay Action Button */}
              <button
                onClick={handlePay}
                disabled={isProcessing}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Authenticating via Razorpay...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Pay ₹{amount.toLocaleString('en-IN')} Securely
                  </span>
                )}
              </button>
            </>
          ) : (
            /* PAYMENT SUCCESS STATE */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="font-bold text-xl text-white">Payment Successful!</h3>
                <p className="text-xs text-emerald-400 font-medium mt-1">Membership Activated Immediately</p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 text-left text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Transaction ID:</span>
                  <span className="text-slate-200 font-bold">{transactionId}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Plan Activated:</span>
                  <span className="text-slate-200">{planName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-400 font-bold">₹{amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
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
