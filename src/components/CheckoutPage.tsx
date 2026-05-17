import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ShieldCheck, Smartphone, Info, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

export default function CheckoutPage() {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const id = path.split('/').pop();
    if (id && id !== 'checkout') {
      setRequestId(id);
      fetchInfo(id);
      
      // Auto-polling for status check
      const interval = setInterval(() => {
        if (data?.status !== 'matched') {
          fetchInfo(id);
        }
      }, 5000);
      
      return () => clearInterval(interval);
    } else {
      setError('Invalid Request ID');
      setLoading(false);
    }
  }, [data?.status]);

  const fetchInfo = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/checkout-info/${id}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        // If it just matched, we can stop any submitting state
        if (json.status === 'matched') {
          setSubmitting(false);
        }
      } else {
        setError(json.error || 'Failed to load checkout info');
      }
    } catch (e) {
      console.error('Polling error:', e);
    } finally {
      setLoading(false);
    }
  };

  const verifyTrx = async () => {
    if (!trxId || trxId.length < 5) return;
    setSubmitting(true);
    
    // We send the TrxID to the server to "help" the matching engine
    // though the SMS app will usually be the primary driver.
    try {
      await fetch(`/api/v1/update-trxid/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trxId })
      });
    } catch (e) {
      console.error('Update TrxID error:', e);
    }

    // After manual input, we wait a bit and poll again
    setTimeout(() => {
      fetchInfo(requestId!);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full text-center space-y-4">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Info className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">পেজটি পাওয়া যায়নি</h2>
          <p className="text-gray-500 text-sm">{error}</p>
          <button 
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  const isMatched = data?.status === 'matched';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-center space-y-4">
            <div className="bg-white/20 w-fit p-3 rounded-2xl backdrop-blur-md mx-auto">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">পেমেন্ট গেটওয়ে</h2>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">{data?.merchantName}</p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {isMatched ? (
              <div className="text-center space-y-6 py-6 animate-in zoom-in duration-500">
                <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900">পেমেণ্ট সফল হয়েছে!</h3>
                  <p className="text-gray-500 text-sm">আপনার ট্রানজেকশন ভেরিফাই করা হয়েছে। অটোমেটিক রিডাইরেক্ট করা হচ্ছে...</p>
                </div>
                <div className="pt-4">
                   <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Amount Paid</span>
                      <span className="text-3xl font-black text-emerald-700">Tk {data?.amount}</span>
                   </div>
                </div>
              </div>
            ) : (
              <>
                {/* Amount Display */}
                <div className="text-center space-y-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মোট পরিশোধযোগ্য টাকা</span>
                  <div className="text-5xl font-black text-gray-900 tracking-tighter">Tk {data?.amount}</div>
                  <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    <Smartphone className="w-3 h-3" /> {data?.provider} Method
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                  <h4 className="text-center text-xs font-black text-gray-400 uppercase tracking-widest">প্রদানের নিয়মাবলী</h4>
                  <div className="space-y-4">
                    <div className="flex flex-col items-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">এই নম্বরে সেন্ডমানি করুন</span>
                      <span className="text-2xl font-black text-gray-900 font-mono tracking-wider">{data?.merchantNumber}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 text-center leading-relaxed font-medium">
                      উপরোক্ত {data?.provider} নম্বরে ঠিক <span className="text-blue-600 font-bold">Tk {data?.amount}</span> সেন্ডমানি করার পর নিচে ট্রানজেকশন আইডি প্রদান করুন।
                    </p>
                  </div>
                </div>

                {/* TrxID Input */}
                <div className="space-y-3">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Transaction ID (e.g. BNK928J2K)"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 px-6 text-center text-lg font-black tracking-widest placeholder:text-gray-300 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <button 
                    onClick={verifyTrx}
                    disabled={submitting || trxId.length < 5}
                    className={cn(
                      "w-full py-5 rounded-2xl font-black text-lg transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3",
                      trxId.length >= 5 
                        ? "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700" 
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" /> Verifying...
                      </>
                    ) : (
                      "Confirm Payment"
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="pt-4 text-center border-t border-gray-50">
              <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Secured by Gateway Panel
              </div>
            </div>
          </div>
        </div>
        
        {/* Support Link */}
        <p className="text-center mt-6 text-[11px] text-gray-400 font-medium">
          পেমেন্টে সমস্যা হচ্ছে? <a href="#" className="text-blue-500 font-bold hover:underline">সহযোগিতা নিন</a>
        </p>
      </div>
    </div>
  );
}
