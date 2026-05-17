import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Check, Zap, ArrowRight, ShieldCheck, Copy, RefreshCcw, Loader2, Info } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Plan, SystemConfig, UserProfile } from '../types';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface BillingProps {
  profile: UserProfile | null;
  onUpgrade: (show: boolean) => void;
}

type DepositStep = 'method' | 'amount' | 'trxid' | 'success';

export default function Billing({ profile, onUpgrade }: BillingProps) {
  const [step, setStep] = useState<DepositStep>('method');
  const [selectedMethod, setSelectedMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [trxId, setTrxId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'config'));
        if (snap.exists()) {
          setConfig(snap.data() as SystemConfig);
        }
      } catch (e) {
        console.error("Error fetching config:", e);
      }
    };
    fetchConfig();
  }, []);

  const paymentMethods = [
    { id: 'bKash', name: 'bKash', color: 'bg-pink-600', icon: 'https://searchlogotype.com/wp-content/uploads/2020/03/bkash-logo-vector-400x400.png' },
    { id: 'Nagad', name: 'Nagad', color: 'bg-orange-500', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Nagad_Logo.svg/1024px-Nagad_Logo.svg.png' },
    { id: 'Rocket', name: 'Rocket', color: 'bg-purple-700', icon: 'https://play-lh.googleusercontent.com/y1vU-G_V4_R_ZkEUKyVv-bL_k-j_pL2U8_T_9_T_y_O_v_p_p_p_p_p_p_p_p_p_p' }
  ] as const;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitDeposit = async () => {
    if (!profile || !selectedMethod || !amount || !trxId) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'userDeposits'), {
        userId: profile.id,
        userName: profile.name,
        method: selectedMethod,
        amount: parseFloat(amount),
        trxId,
        status: 'pending',
        createdAt: new Date().toISOString(), // Use simple ISO string for now or serverTimestamp
        serverCreatedAt: serverTimestamp()
      });
      setStep('success');
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getReceiverNumber = () => {
    if (!config) return "01XXXXXXXXX";
    if (selectedMethod === 'bKash') return config.bkashNumber || "01XXXXXXXXX";
    if (selectedMethod === 'Nagad') return config.nagadNumber || "01XXXXXXXXX";
    if (selectedMethod === 'Rocket') return config.rocketNumber || "01XXXXXXXXX";
    return "01XXXXXXXXX";
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="bg-white p-4 sm:p-8 rounded-2xl border border-gray-100 shadow-sm min-h-[400px] sm:min-h-[500px] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 font-display">
                  {step === 'method' && 'পেমেন্ট মেথড সিলেক্ট করুন'}
                  {step === 'amount' && 'টাকার পরিমাণ লিখুন'}
                  {step === 'trxid' && 'টাকা পাঠিয়ে ট্রানজেকশন আইডি দিন'}
                  {step === 'success' && 'আবেদন সফল হয়েছে'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {step === 'method' && 'ডিপোজিট করতে নিচের যেকোনো একটি মেথড বেছে নিন'}
                  {step === 'amount' && `${selectedMethod} এর মাধ্যমে কত টাকা ডিপোজিট করতে চান?`}
                  {step === 'trxid' && 'নিচের নাম্বারে টাকা পাঠিয়ে ট্রানজেকশন আইডি ইনপুট দিন'}
                  {step === 'success' && 'আপনার ডিপোজিট রিকোয়েস্টটি পেন্ডিং আছে, দ্রুত এপ্রুভ করা হবে।'}
                </p>
              </div>
              {step !== 'method' && step !== 'success' && (
                <button 
                  onClick={() => setStep(step === 'amount' ? 'method' : 'amount')}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  পিছনে যান
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {step === 'method' && (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                  {paymentMethods.map((m) => (
                    <button 
                      key={m.id}
                      onClick={() => { setSelectedMethod(m.id); setStep('amount'); }}
                      className="p-6 sm:p-8 rounded-2xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50/30 transition-all flex flex-col items-center gap-4 group"
                    >
                      <div className={cn("w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center p-3 shadow-sm transition-transform group-hover:scale-110", m.color)}>
                         <CreditCard className="w-8 h-8 sm:w-10 sm:h-10 text-white/90" />
                      </div>
                      <span className="font-bold text-gray-900 text-base sm:text-lg">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 'amount' && (
                <div className="max-w-md mx-auto w-full space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">টাকার পরিমাণ (BDT)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-16 px-6 bg-gray-50 rounded-2xl border border-gray-100 text-2xl font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-gray-400 pointer-events-none">TK</span>
                    </div>
                  </div>
                  <button 
                    disabled={!amount || parseFloat(amount) <= 0}
                    onClick={() => setStep('trxid')}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    পরবর্তী ধাপ (Next)
                  </button>
                </div>
              )}

              {step === 'trxid' && (
                <div className="max-w-md mx-auto w-full space-y-6 sm:space-y-8">
                  <div className="bg-blue-50 p-4 sm:p-6 rounded-2xl border border-blue-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-blue-900">রিসিভার নাম্বার ({selectedMethod})</span>
                      <button 
                        onClick={() => handleCopy(getReceiverNumber())}
                        className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-blue-600 hover:text-blue-700 active:scale-95 transition-all"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'কপি হয়েছে' : 'কপি করুন'}
                      </button>
                    </div>
                    <div className="text-xl sm:text-3xl font-black text-gray-900 tracking-wider break-all">
                      {getReceiverNumber()}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-blue-600 font-medium">
                      * এই নাম্বারে <b>{amount} TK</b> "সেণ্ড মানি" করুন এবং নিচের ঘরে ট্রানজেকশন আইডি দিন।
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Transaction ID (TrxID)</label>
                    <input 
                      type="text" 
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                      placeholder="8X9Y0Z1A2B"
                      className="w-full h-14 px-5 bg-gray-50 rounded-xl border border-gray-100 text-lg font-mono font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  <button 
                    disabled={loading || !trxId}
                    onClick={handleSubmitDeposit}
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    পেমেন্ট সম্পন্ন করুন (Confirm)
                  </button>
                </div>
              )}

              {step === 'success' && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <Check className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">রিকোয়েস্ট সেন্ট!</h4>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                      আপনার <b>{amount} TK</b> ডিপোজিট রিকোয়েস্ট (TrxID: {trxId}) প্রসেসিং হচ্ছে। 
                      সিস্টেম অটোমেটিক আপনার ট্রানজেকশন ম্যাচ করার চেষ্টা করছে। সফল হলে অটো ব্যালেন্স অ্যাড হয়ে যাবে।
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button 
                      onClick={() => { setStep('method'); setSelectedMethod(null); setAmount(''); setTrxId(''); }}
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                      আরও ফান্ড অ্যাড করুন
                    </button>
                    <button 
                      onClick={() => window.location.reload()} // Hack to refresh dashboard state if needed, but App.tsx handles it. Actually just return to dashboard.
                      className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all"
                    >
                      ড্যাশবোর্ডে ফিরে যান
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 p-5 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <b>সতর্কতা:</b> সঠিক ট্রানজেকশন আইডি প্রদান করুন। ভুল আইডি দিলে আপনার পেমেন্ট রিজেক্ট হতে পারে। ট্রানজেকশন আইডি বড় হাতের অক্ষরে দিন।
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 font-display">Subscription Summary</h3>
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 mb-6">
              <span className="text-[10px] font-black uppercase text-blue-600 bg-white px-2 py-0.5 rounded-full mb-2 inline-block">Active Plan</span>
              <div className="text-3xl font-black text-gray-900 capitalize">{profile?.plan || 'free'}</div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Billing Cycle</span>
                <span className="text-gray-900 font-bold">Monthly</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">SMS Limit</span>
                <span className="text-gray-900 font-bold">Unlimited</span>
              </div>
            </div>

            <button 
              onClick={() => onUpgrade(true)}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              Plan পরিবর্তন করুন <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">সার্পোট প্রয়োজন?</h4>
            <div className="space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                পেমেন্ট সংক্রান্ত কোনো সমস্যা হলে সরাসরি আমাদের সাথে টেলিগ্রাম বা হোয়াটসঅ্যাপে যোগাযোগ করুন।
              </p>
              <button className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all">
                WhatsApp Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
