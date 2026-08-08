import React, { useState } from 'react';
import { SupplementProduct } from '../lib/types';
import { ShoppingBag, Star, CheckCircle, X, Plus, Minus, CreditCard } from 'lucide-react';

interface SupplementStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: SupplementProduct[];
}

export const SupplementStoreModal: React.FC<SupplementStoreModalProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [isPurchased, setIsPurchased] = useState(false);

  if (!isOpen) return null;

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      if (copy[id] > 1) {
        copy[id] -= 1;
      } else {
        delete copy[id];
      }
      return copy;
    });
  };

  const totalItems = Object.values(cart).reduce((a: number, b: number) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((sum: number, [id, qty]: [string, number]) => {
    const prod = products.find((p) => p.id === id);
    return sum + (prod ? prod.priceINR * qty : 0);
  }, 0);

  const handleCheckout = () => {
    setIsPurchased(true);
    setTimeout(() => {
      setIsPurchased(false);
      setCart({});
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Body Line Store & Gear</h2>
              <p className="text-xs text-slate-400">Authentic supplements & high-performance apparel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isPurchased ? (
          <div className="p-12 text-center my-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100">Order Confirmed!</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Your items have been billed to your gym account. Pick up at the Body Line Front Desk anytime.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
            {/* Products grid */}
            <div className="md:col-span-2 p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 border-r border-slate-800">
              {products.map((prod) => {
                const qty = cart[prod.id] || 0;
                return (
                  <div
                    key={prod.id}
                    className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-600 transition-all"
                  >
                    <div>
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-full h-28 object-cover rounded-xl mb-3 border border-slate-700/40"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className="font-semibold text-emerald-400">{prod.category}</span>
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="w-3 h-3 fill-current" /> {prod.rating}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 line-clamp-1">{prod.name}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">{prod.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                      <span className="text-base font-extrabold text-slate-100">
                        ₹{prod.priceINR.toLocaleString('en-IN')}
                      </span>

                      {qty > 0 ? (
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-1">
                          <button
                            onClick={() => removeFromCart(prod.id)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-300"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-emerald-400 px-1">{qty}</span>
                          <button
                            onClick={() => addToCart(prod.id)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-300"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(prod.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all"
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart checkout sidebar */}
            <div className="p-6 bg-slate-950/60 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center justify-between">
                  <span>Cart Summary</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {totalItems} items
                  </span>
                </h3>

                {totalItems === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Your cart is currently empty.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {Object.entries(cart).map(([id, qty]: [string, number]) => {
                      const prod = products.find((p) => p.id === id);
                      if (!prod) return null;
                      return (
                        <div key={id} className="flex items-center justify-between text-xs">
                          <div className="truncate pr-2">
                            <p className="font-semibold text-slate-200 truncate">{prod.name}</p>
                            <p className="text-slate-400">
                              {qty} x ₹{prod.priceINR.toLocaleString('en-IN')}
                            </p>
                          </div>
                          <span className="font-bold text-emerald-400 whitespace-nowrap">
                            ₹{(prod.priceINR * qty).toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Total Payable</span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    ₹{totalPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                <button
                  disabled={totalItems === 0}
                  onClick={handleCheckout}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                    totalItems === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> Bill to Member Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
