import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserDeposit, UserProfile } from '../types';
import { Check, X, Clock, User, CreditCard, ExternalLink, Loader2, Search, RefreshCcw } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState<UserDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'userDeposits'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setDeposits(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserDeposit)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleStatusUpdate = async (deposit: UserDeposit, newStatus: 'approved' | 'rejected') => {
    if (!confirm(`Are you sure you want to ${newStatus} this deposit?`)) return;
    setProcessingId(deposit.id);
    try {
      // Get current user profile to update balance
      const userRef = doc(db, 'users', deposit.userId);
      const userSnap = await getDoc(userRef);
      
      if (newStatus === 'approved' && userSnap.exists()) {
        const userData = userSnap.data();
        const currentBalance = userData.balance || 0;
        await updateDoc(userRef, {
          balance: currentBalance + deposit.amount
        });
      }

      // Update deposit status
      await updateDoc(doc(db, 'userDeposits', deposit.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      alert(`Deposit ${newStatus} successfully!`);
    } catch (e) {
      console.error(e);
      alert("Error updating status.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredDeposits = deposits.filter(d => 
    d.trxId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [manualAmount, setManualAmount] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [addingFund, setAddingFund] = useState(false);
  const [rescanning, setRescanning] = useState(false);

  const handleRescan = async () => {
    setRescanning(true);
    try {
      const res = await fetch('/api/v1/admin/rescan-deposits', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        alert(`${data.message || 'Auto-matching complete!'} Matches: ${data.matchedCount}`);
      } else {
        alert(data.error || "Rescan failed.");
        if (data.details) console.error("Rescan details:", data.details);
      }
    } catch (e) {
      console.error(e);
      alert("Error during rescan. Server may be offline or taking too long.");
    } finally {
      setRescanning(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualUserId || !manualAmount) return;
    setAddingFund(true);
    try {
      const userRef = doc(db, 'users', manualUserId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        alert("User not found!");
        return;
      }
      const userData = userSnap.data();
      const nextBalance = (userData.balance || 0) + Number(manualAmount);
      await updateDoc(userRef, { balance: nextBalance });
      
      // Log as transaction
      await addDoc(collection(db, 'transactions'), {
        userId: manualUserId,
        amount: Number(manualAmount),
        type: 'credit',
        description: 'Admin Manual Credit',
        timestamp: new Date().toISOString()
      });

      alert("Fund added successfully!");
      setManualAmount('');
      setManualUserId('');
    } catch (e) {
      console.error(e);
      alert("Failed to add fund");
    } finally {
      setAddingFund(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Quick Add Fund */}
      <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-100 flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-emerald-100">User ID to Credit</label>
          <input 
            type="text" 
            value={manualUserId}
            onChange={(e) => setManualUserId(e.target.value)}
            placeholder="Enter User Firebase ID"
            className="w-full h-11 px-4 bg-emerald-700/50 border border-emerald-500/50 rounded-xl text-white placeholder:text-emerald-300 text-sm outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
        <div className="w-full md:w-48 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Amount (TK)</label>
          <input 
            type="number" 
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            placeholder="0.00"
            className="w-full h-11 px-4 bg-emerald-700/50 border border-emerald-500/50 rounded-xl text-white placeholder:text-emerald-300 text-sm outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
        <button 
          onClick={handleManualAdd}
          disabled={addingFund || !manualUserId || !manualAmount}
          className="h-11 px-8 bg-white text-emerald-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-50 transition-all disabled:opacity-50"
        >
          {addingFund ? 'Processing...' : 'Direct Add Fund'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Deposit Requests
        </h3>
        <div className="flex gap-4">
          <button 
            onClick={handleRescan}
            disabled={rescanning}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
          >
            {rescanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            {rescanning ? 'Matching...' : 'Trigger Auto-Match'}
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search TrxID or User..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User / Method</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount & TrxID</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No deposits found.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs",
                          d.method === 'bKash' ? 'bg-pink-600' : d.method === 'Nagad' ? 'bg-orange-500' : 'bg-purple-700'
                        )}>
                          {d.method[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{d.userName || 'Unknown'}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{d.userId?.substring(0, 8) || 'unknown'}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-blue-600">{d.amount} TK</div>
                      <div className="text-[11px] font-mono font-bold text-gray-500 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> {d.trxId}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600">{format(new Date(d.createdAt), 'MMM dd, HH:mm')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        d.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                        d.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-red-100 text-red-700'
                      )}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {d.status === 'pending' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleStatusUpdate(d, 'approved')}
                            disabled={!!processingId}
                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Approve"
                          >
                            {processingId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(d, 'rejected')}
                            disabled={!!processingId}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
