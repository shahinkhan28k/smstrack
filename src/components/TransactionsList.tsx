import React, { useState } from 'react';
import { Transaction, DepositRequest, RawSMS } from '../types';
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
  ChevronRight,
  ShieldCheck,
  Zap,
  Smartphone
} from 'lucide-react';

interface TransactionsListProps {
  transactions: Transaction[];
  depositRequests: DepositRequest[];
  rawSMS?: RawSMS[];
}

export default function TransactionsList({ transactions, depositRequests, rawSMS = [] }: TransactionsListProps) {
  const [view, setView] = useState<'history' | 'raw' | 'matches'>('history');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center p-1 bg-gray-100 rounded-lg overflow-x-auto max-w-full">
            <button 
              onClick={() => setView('history')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 whitespace-nowrap",
                view === 'history' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <ArrowRightLeft className="w-3 h-3" />
              Transactions
            </button>
            <button 
              onClick={() => setView('raw')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 whitespace-nowrap",
                view === 'raw' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Smartphone className="w-3 h-3" />
              Raw SMS Logs
            </button>
            <button 
              onClick={() => setView('matches')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 whitespace-nowrap",
                view === 'matches' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <ShieldCheck className="w-3 h-3" />
              Deposit Tracking
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100 hidden sm:block">
            {view === 'raw' ? 'Device Listening Active' : 'Auto-Matching Active'}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {view === 'history' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sender</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900 font-mono tracking-tighter">{tx.trxId}</div>
                    <div className="text-[10px] text-gray-400 font-medium truncate max-w-[150px] mt-0.5">{tx.message}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                      tx.provider.toLowerCase() === 'bkash' ? "bg-pink-50 text-pink-600" :
                      tx.provider.toLowerCase() === 'nagad' ? "bg-orange-50 text-orange-600" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {tx.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{tx.sender}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">{formatCurrency(tx.amount)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-xs font-bold text-gray-900">{format(new Date(tx.createdAt), 'MMM dd')}</div>
                    <div className="text-[10px] text-gray-400">{format(new Date(tx.createdAt), 'HH:mm')}</div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <EmptyState icon={Clock} title="No Transactions" desc="Matching transactions will appear here automatically." />
              )}
            </tbody>
          </table>
        )}

        {view === 'raw' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sender</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Content</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rawSMS.map((sms) => (
                <tr key={sms.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{sms.sender}</div>
                    <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">
                      <Smartphone className="w-3 h-3" />
                      {sms.deviceId ? `ID: ${sms.deviceId.substring(0, 8)}` : 'Gateway API'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600 font-medium leading-relaxed max-w-md bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {sms.message}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-xs font-bold text-gray-900">{format(new Date(sms.timestamp), 'HH:mm:ss')}</div>
                    <div className="text-[10px] text-gray-400">{format(new Date(sms.timestamp), 'MMM dd, yyyy')}</div>
                  </td>
                </tr>
              ))}
              {rawSMS.length === 0 && (
                <EmptyState icon={Smartphone} title="Listening for SMS..." desc="SMS messages from your connected Android devices will stream here in real-time." />
              )}
            </tbody>
          </table>
        )}

        {view === 'matches' && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Request ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Match Result</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {depositRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono font-bold text-gray-500 uppercase">
                    {req.externalId || req.id?.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(req.amount)}</td>
                  <td className="px-6 py-4">
                    {req.status === 'matched' ? (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-bold">Successfully Matched</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-500">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span className="text-xs font-bold italic">Waiting for SMS...</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm border",
                      req.status === 'matched' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                    )}>
                      {req.status === 'matched' ? 'Completed' : 'Scanning'}
                    </span>
                  </td>
                </tr>
              ))}
              {depositRequests.length === 0 && (
                <EmptyState icon={ShieldCheck} title="No Tracking Data" desc="Start a matching session to track logs here." />
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
