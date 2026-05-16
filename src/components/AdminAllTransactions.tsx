import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction } from '../types';
import { History, Search, Loader2, CreditCard, ArrowDownRight, ArrowUpLeft, User, Filter } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

export default function AdminAllTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(500));
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = 
      filterType === 'all' || 
      (filterType === 'credit' && t.type === 'credit') ||
      (filterType === 'debit' && t.type === 'debit');

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-xl">
            <History className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Platform History</h3>
            <p className="text-sm text-gray-500">Real-time log of all financial activities across the platform.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            {(['all', 'credit', 'debit'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                  filterType === type ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search user, ID or description..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        t.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      )}>
                        {t.type === 'credit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpLeft className="w-4 h-4" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[11px] font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded inline-flex items-center gap-1">
                        <User className="w-3 h-3" /> {t.userId?.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "text-sm font-black",
                        t.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {t.type === 'credit' ? '+' : '-'}{t.amount} TK
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-gray-900 truncate max-w-[200px]">{t.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500">
                        {t.timestamp ? format(new Date(t.timestamp), 'MMM dd, HH:mm') : 'N/A'}
                      </div>
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
