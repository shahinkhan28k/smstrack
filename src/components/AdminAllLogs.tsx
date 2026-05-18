import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RawSMS } from '../types';
import { History, Search, Loader2, Smartphone, Terminal, Filter, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function AdminAllLogs() {
  const [logs, setLogs] = useState<RawSMS[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'raw_sms'), limit(300));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as RawSMS));
      // Client-side sort
      docs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(docs.slice(0, 200));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filteredLogs = logs.filter(l => 
    l.message?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-xl">
            <Terminal className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Global Activity Logs</h3>
            <p className="text-sm text-gray-500">Monitoring every SMS entering the system across all users.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search message, sender or user ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User/Device</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sender</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Content</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No logs recorded yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-bold text-gray-900 mb-1">User: {log.userId?.substring(0, 8)}...</div>
                      <div className="flex items-center gap-1 text-[9px] text-blue-600 font-black uppercase tracking-tighter">
                        <Smartphone className="w-3 h-3" /> {log.deviceId || 'API'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{log.sender}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600 font-medium leading-relaxed max-w-lg bg-gray-50 p-3 rounded-xl border border-gray-100 group relative">
                        {log.message}
                        {(log as any).originalBody && (
                          <div className="hidden group-hover:block absolute left-0 top-full mt-2 p-3 bg-gray-900 text-emerald-400 text-[10px] font-mono rounded-xl z-30 shadow-2xl max-w-xs break-all">
                            <p className="text-gray-500 mb-1 font-bold uppercase">Raw Payload:</p>
                            {(log as any).originalBody}
                          </div>
                        )}
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
                      <div className="text-[9px] text-gray-400">{format(new Date(log.timestamp), 'MMM dd, yyyy')}</div>
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
