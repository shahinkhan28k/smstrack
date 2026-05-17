import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Device, UserProfile } from '../types';
import { Smartphone, Trash2, Shield, Search, Loader2, Signal, SignalLow, User, Calendar, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function AdminAllDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'devices'), orderBy('lastSeen', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Device)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm("Are you sure you want to remove this device? The user will have to pair it again.")) return;
    setProcessingId(deviceId);
    try {
      await deleteDoc(doc(db, 'devices', deviceId));
    } catch (e) {
      console.error(e);
      alert("Removal failed");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredDevices = devices.filter(d => 
    d.deviceName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.deviceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.userId?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-xl">
            <Smartphone className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">All Devices</h3>
            <p className="text-sm text-gray-500">View and manage all connected SMS Gateway devices.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search devices or user ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Devices</div>
          <div className="text-2xl font-black text-gray-900">{devices.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Online Now</div>
          <div className="text-2xl font-black text-emerald-600">{devices.filter(d => d.status === 'online').length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Offline</div>
          <div className="text-2xl font-black text-red-600">{devices.filter(d => d.status !== 'online').length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Unique Users</div>
          <div className="text-2xl font-black text-blue-600">{new Set(devices.map(d => d.userId)).size}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Device Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Seen</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDevices.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        d.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                      )}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{d.deviceName || (d as any).name || 'Unknown Device'}</div>
                        <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 uppercase">
                          <Shield className="w-2.5 h-2.5" /> {d.deviceId?.substring(0, 12)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded inline-flex items-center gap-1 group cursor-pointer hover:bg-gray-100 transition-colors">
                      <User className="w-3 h-3" /> {d.userId?.substring(0, 8)}...
                      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        d.status === 'online' ? 'bg-emerald-500' : 'bg-red-400'
                      )} />
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        d.status === 'online' ? 'text-emerald-700' : 'text-red-700'
                      )}>
                        {d.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {d.lastSeen || (d as any).lastActive ? format(new Date(d.lastSeen || (d as any).lastActive), 'MMM dd, HH:mm:ss') : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDeleteDevice(d.id)}
                      disabled={processingId === d.id}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Remove Device"
                    >
                      {processingId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
