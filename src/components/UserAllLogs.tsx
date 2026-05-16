import React, { useState } from 'react';
import { RawSMS } from '../types';
import { Search, Loader2, Smartphone, AlertCircle, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface UserAllLogsProps {
  logs: RawSMS[];
  loading: boolean;
}

export default function UserAllLogs({ logs, loading }: UserAllLogsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(l => 
    l.message?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.sender?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-xl">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Incoming API Logs (মেসেজ লগ)</h3>
            <p className="text-sm text-gray-500">আপনার এপিআই-তে আসা প্রতিটা মেসেজ এখানে দেখা যাবে।</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search message or sender..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
          <p className="font-bold mb-1">প্রো-টিপ (Pro Tip):</p>
          যদি কোনো মেসেজ এখানে শো করে কিন্তু 'History' তে না আসে, তবে এর অর্থ হলো মেসেজ থেকে ট্রানজেকশন ডাটা (Amount/TrxID) অটোমেটিক বের করা যায়নি অথবা ডিপোজিট রিকোয়েস্টের সাথে ম্যাচ করেনি।
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sender / Provider</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Content</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No incoming logs found yet. Connect your device or send data via API.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{log.sender}</div>
                      <div className="flex items-center gap-1 text-[9px] text-blue-600 font-black uppercase tracking-tighter mt-1">
                        <Smartphone className="w-3 h-3" /> {log.deviceId || 'GATEWAY'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600 font-medium leading-relaxed max-w-lg bg-gray-50 p-3 rounded-xl border border-gray-100">
                        {log.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                        log.status === 'processed' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {log.status}
                      </span>
                      <div className="text-[10px] font-bold text-gray-900 mt-2">{format(new Date(log.timestamp), 'HH:mm:ss')}</div>
                      <div className="text-[9px] text-gray-400">{format(new Date(log.timestamp), 'MMM dd')}</div>
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
