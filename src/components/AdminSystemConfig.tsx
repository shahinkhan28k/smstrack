import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SystemConfig } from '../types';
import { Save, Loader2, CreditCard, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AdminSystemConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    bkashNumber: '',
    nagadNumber: '',
    rocketNumber: '',
    appVersion: '1.0.0',
    isMaintenance: false,
    announcement: ''
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'config'));
        if (snap.exists()) {
          setConfig(snap.data() as SystemConfig);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'config'), {
        ...config,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert("Config updated successfully!");
    } catch (e) {
      console.error(e);
      alert("Error updating config.");
    } finally {
      setSaving(false);
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-2 font-display text-center">Payment Numbers (রিসিভ নাম্বার)</h3>
        <p className="text-sm text-gray-500 mb-10 text-center">ডিপোজিট পেইজে ইউজাররা এই নাম্বারগুলো দেখতে পাবে।</p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-600"></span>
              bKash Wallet Number
            </label>
            <input 
              type="text" 
              value={config.bkashNumber}
              onChange={(e) => setConfig({ ...config, bkashNumber: e.target.value })}
              placeholder="017XXXXXXXX"
              className="w-full h-14 px-5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-pink-500 focus:bg-white outline-none transition-all text-lg font-bold text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Nagad Wallet Number
            </label>
            <input 
              type="text" 
              value={config.nagadNumber}
              onChange={(e) => setConfig({ ...config, nagadNumber: e.target.value })}
              placeholder="018XXXXXXXX"
              className="w-full h-14 px-5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-lg font-bold text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-700"></span>
              Rocket Wallet Number
            </label>
            <input 
              type="text" 
              value={config.rocketNumber}
              onChange={(e) => setConfig({ ...config, rocketNumber: e.target.value })}
              placeholder="019XXXXXXXX"
              className="w-full h-14 px-5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-700 focus:bg-white outline-none transition-all text-lg font-bold text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">App Version</label>
              <input 
                type="text" 
                value={config.appVersion}
                onChange={(e) => setConfig({ ...config, appVersion: e.target.value })}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Maintenance Mode</label>
              <div className="flex items-center gap-3 h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl">
                <button 
                  onClick={() => setConfig({...config, isMaintenance: !config.isMaintenance})}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                    config.isMaintenance ? "bg-red-600" : "bg-gray-200"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    config.isMaintenance ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
                <span className="text-xs font-bold text-gray-600">{config.isMaintenance ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Announcement (ড্যাশবোর্ড এনাউন্সমেন্ট)</label>
            <textarea 
              value={config.announcement}
              onChange={(e) => setConfig({ ...config, announcement: e.target.value })}
              placeholder="Enter message for all users..."
              className="w-full h-24 p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium resize-none"
            />
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 mt-8 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex gap-4">
        <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
        <div className="text-xs text-blue-800 leading-relaxed">
          <b>দ্রষ্টব্য:</b> এই নাম্বারগুলো পরিবর্তন করার সাথে সাথে সকল ইউজারদের ডিপোজিট পেইজে নতুন নাম্বার আপডেট হয়ে যাবে। নাম্বার দেওয়ার আগে অবশ্যই পুনরায় সঠিকতা যাচাই করে নিন।
        </div>
      </div>
    </div>
  );
}
