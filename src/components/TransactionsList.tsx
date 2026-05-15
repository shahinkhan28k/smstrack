import React, { useState } from 'react';
import { Transaction, DepositRequest } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { 
  Download, 
  ExternalLink, 
  MoreVertical,
  CheckCircle2,
  Clock,
  Ban,
  ArrowRightLeft,
  ChevronRight
} from 'lucide-react';

interface TransactionsListProps {
  transactions: Transaction[];
  depositRequests: DepositRequest[];
}

export default function TransactionsList({ transactions, depositRequests }: TransactionsListProps) {
  const [view, setView] = useState<'all' | 'matches'>('all');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center p-1 bg-gray-100 rounded-lg">
            <button 
              onClick={() => setView('all')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                view === 'all' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Raw SMS
            </button>
            <button 
              onClick={() => setView('matches')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                view === 'matches' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Deposit Matches
            </button>
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 border border-gray-100 rounded-lg transition-all shadow-sm">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>

      <div className="overflow-x-auto">
        {view === 'all' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Transaction ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Provider</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Sender / Phone</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 font-mono tracking-tighter">{tx.trxId}</span>
                      <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-all">
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                      tx.provider.toLowerCase() === 'bkash' ? "bg-pink-50 text-pink-600" :
                      tx.provider.toLowerCase() === 'nagad' ? "bg-orange-50 text-orange-600" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {tx.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{tx.sender}</div>
                    <div className="text-xs text-gray-500 font-medium">{tx.phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-emerald-600">{formatCurrency(tx.amount)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">{format(new Date(tx.createdAt), 'MMM dd, yyyy')}</div>
                    <div className="text-xs text-gray-400">{format(new Date(tx.createdAt), 'HH:mm:ss')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-bold text-gray-600">Processed</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <EmptyState icon={Clock} title="No SMS Transactions" desc="Your connected devices haven't received any matching SMS yet." />
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">External ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Expected Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Match Result</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Created At</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {depositRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 truncate max-w-[120px]">{req.externalId || req.id.substring(0, 8)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(req.amount)}</td>
                  <td className="px-6 py-4">
                    {req.status === 'matched' ? (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <ArrowRightLeft className="w-4 h-4" />
                        <span className="text-xs font-bold truncate max-w-[100px]">Matched TXID</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-bold">Scanning...</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-500 font-medium">{format(new Date(req.createdAt), 'MMM dd, HH:mm')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                      req.status === 'matched' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-gray-900 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {depositRequests.length === 0 && (
                <EmptyState icon={ArrowRightLeft} title="No Deposit Requests" desc="Register a deposit request via API to start matching with SMS data." />
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-20 text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-300">
            <Icon className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-1 max-w-[250px] mx-auto leading-relaxed">{desc}</p>
        </div>
      </td>
    </tr>
  );
}
