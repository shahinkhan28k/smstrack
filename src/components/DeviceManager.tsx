import React, { useState } from 'react';
import { Device } from '../types';
import { Smartphone, RefreshCw, Trash2, Shield, Circle, User, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

interface DeviceManagerProps {
  devices: Device[];
  userId: string;
  onShowAddDevice: () => void;
}

export default function DeviceManager({ devices, userId, onShowAddDevice }: DeviceManagerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to disconnect this device?')) {
      await deleteDoc(doc(db, 'devices', id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-8 overflow-hidden relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">SMS Gateway Configuration</h3>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              আপনার এন্ড্রয়েড অ্যাপে নিচের URL টি <b>"Forwarding URL"</b> বা <b>"HTTP URL"</b> হিসেবে সেট করুন। এর মাধ্যমে আপনার ফোনে আসা এসএমএস গুলো আমাদের সার্ভারে জমা হবে এবং অটো-ম্যাচিং কাজ করবে।
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl font-mono text-[11px] sm:text-xs text-blue-700 font-bold select-all truncate">
                {`${window.location.origin}/api/v1/receive`}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/v1/receive`);
                  alert('URL Coipied!');
                }}
                className="px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <RefreshCw className="w-4 h-4" />
                Copy URL
              </button>
            </div>
          </div>
          <div className="w-full md:w-auto p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-1 text-amber-700">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Setup Note</span>
            </div>
            <p className="text-[10px] text-amber-800 font-medium leading-relaxed max-w-xs">
              অ্যাপে HTTP Method টি <b>POST</b> হতে হবে। এর সাথে আপনার <b>API Key</b> এবং <b>Secret Key</b> প্যাসওয়ার্ড হিসেবে বা হেডার হিসেবে ব্যবহার করতে পারেন।
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <div key={device.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                device.status === 'online' ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"
              )}>
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{device.deviceName}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    device.status === 'online' ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                  )} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {device.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-50">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-medium">Device Token</span>
                <span className="text-gray-900 font-mono font-bold tracking-tighter truncate w-32 text-right">
                  {device.deviceToken?.substring(0, 8) || device.id.substring(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-medium">Last Sync</span>
                <span className="text-gray-900 font-bold">
                  {device.lastSeen ? format(new Date(device.lastSeen), 'MMM dd, HH:mm') : 'Never'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                onClick={() => setIsRefreshing(true)}
              >
                <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
                Ping
              </button>
              <button 
                onClick={() => handleDelete(device.id)}
                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={onShowAddDevice}
          className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-100 transition-all">
            <Smartphone className="w-6 h-6 text-gray-300 group-hover:text-blue-600" />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900">Pair Handset</div>
            <div className="text-xs text-gray-500 mt-1">Scan QR code in Android app</div>
          </div>
        </button>
      </div>

      <div className="mt-8 bg-blue-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <h3 className="text-xl font-bold mb-2">Setup Guide for Android</h3>
          <p className="text-blue-100 text-sm leading-relaxed mb-6">
            Download our APK, login with your API Key & Secret, and enable SMS permissions. 
            Keep the app running in the background for real-time transaction tracking.
          </p>
          <div className="flex gap-4">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); alert('APK Download starting...'); }}
              className="px-6 py-2.5 bg-white text-blue-900 rounded-xl text-sm font-bold hover:bg-blue-50 transition-all text-center"
            >
              Download APK
            </a>
            <button 
              className="px-6 py-2.5 bg-blue-800 text-white border border-blue-700 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
            >
              API Docs
            </button>
          </div>
        </div>
        <Smartphone className="absolute -right-10 -bottom-10 w-64 h-64 text-blue-800 opacity-20 -rotate-12" />
      </div>
    </div>
  );
}
