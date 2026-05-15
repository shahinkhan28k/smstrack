import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserDeposit, UserProfile } from '../types';
import { Clock, Check, X, CreditCard, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface MyDepositsProps {
  profile: UserProfile | null;
}

export default function MyDeposits({ profile }: MyDepositsProps) {
  const [deposits, setDeposits] = useState<UserDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'userDeposits'), 
      where('userId', '==', profile.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setDeposits(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserDeposit)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching deposits:", error);
      setLoading(false);
    });
    return unsub;
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">ডিপোজিট হিস্টোরি (Deposit History)</h3>
          <span className="text-xs text-gray-500">{deposits.length} Records</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Method</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">TrxID & Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                    আপনি এখনো কোনো ডিপোজিট করেননি।
                  </td>
                </tr>
              ) : (
                deposits.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-[10px]",
                          d.method === 'bKash' ? 'bg-pink-600' : d.method === 'Nagad' ? 'bg-orange-500' : 'bg-purple-700'
                        )}>
                          {d.method[0]}
                        </div>
                        <span className="text-sm font-bold text-gray-700">{d.method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-blue-600">{d.amount} TK</div>
                      <div className="text-[11px] font-mono font-medium text-gray-500">{d.trxId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600">{format(new Date(d.createdAt), 'MMM dd, yyyy HH:mm')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {d.status === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                        {d.status === 'approved' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        {d.status === 'rejected' && <X className="w-3.5 h-3.5 text-red-500" />}
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          d.status === 'pending' ? 'text-amber-600' : 
                          d.status === 'approved' ? 'text-emerald-600' : 
                          'text-red-600'
                        )}>
                          {d.status === 'pending' ? 'পেন্ডিং' : d.status === 'approved' ? 'এপ্রুভড' : 'রিজেক্টেড'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
        <CreditCard className="w-5 h-5 text-blue-600 shrink-0" />
        <div className="text-xs text-blue-800 leading-relaxed">
          <b>বিঃদ্রঃ:</b> ডিপোজিট এপ্রুভ হতে ১৫-৩০ মিনিট সময় লাগতে পারে। যদি দীর্ঘ সময় পরও এপ্রুভ না হয়, তবে সাপোর্ট টিমের সাথে যোগাযোগ করুন।
        </div>
      </div>
    </div>
  );
}
