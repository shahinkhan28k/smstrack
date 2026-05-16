import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  Smartphone,
  Key, 
  Copy, 
  RefreshCcw, 
  Check, 
  User, 
  Mail, 
  Plus,
  Lock,
  Wallet,
  Zap,
  Shield,
  QrCode
} from 'lucide-react';
import { cn } from '../lib/utils';
import { generateApiKey, generateApiSecret } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface SettingsPanelProps {
  profile: UserProfile | null;
  onRefresh: () => Promise<void>;
  onShowUpgrade: () => void;
}

export default function SettingsPanel({ profile, onRefresh, onShowUpgrade }: SettingsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState(profile?.webhookUrl || '');
  const [testSms, setTestSms] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const handleTestAi = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/v1/extract-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testSms })
      });
      const data = await res.json();
      setAiResult(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegenerateKeys = async () => {
    if (!profile) return;
    
    // Only show confirmation if there are already keys generated
    if (profile.apiKey) {
      if (!confirm('নতুন এপিআই কি জেনারেট করলে আপনার আগের কানেক্টেড ডিভাইসগুলো ডিসকানেক্ট হয়ে যাবে। আপনি কি নিশ্চিত?')) {
        return;
      }
    }
    
    setLoading(true);
    try {
      const keys = {
        apiKey: generateApiKey(),
        apiSecret: generateApiSecret()
      };
      await updateDoc(doc(db, 'users', profile.id), keys);
      await onRefresh();
    } catch (error) {
      console.error("Error generating keys:", error);
      alert("এপিআই কি জেনারেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.id), {
        webhookUrl
      });
      await onRefresh();
      alert('Settings saved successfully!');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                General Profile
              </h3>
              <button 
                onClick={handleSaveProfile}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium text-gray-900">
                  <User className="w-4 h-4 text-gray-400" />
                  {profile?.name}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium text-gray-900">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {profile?.email}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Webhook Notification URL</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium text-gray-900 focus-within:ring-1 focus-within:ring-blue-500 focus-within:bg-white transition-all">
                <Zap className="w-4 h-4 text-gray-400" />
                <input 
                  type="url" 
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-site.com/webhooks/sms"
                  className="bg-transparent outline-hidden w-full"
                />
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                এটি আপনার মূল ওয়েবসাইটের লিংক। যখনই একটি পেমেন্ট বা এসএমএস ম্যাচ হবে, আমাদের সিস্টেম স্বয়ংক্রিয়ভাবে একটি ডেটা আপনার এই লিংকে পাঠিয়ে দেবে যাতে আপনার ওয়েবসাইটে পেমেন্ট স্ট্যাটাস <b>"Auto Approved"</b> হয়ে যায়।
              </p>
            </div>
          </div>

          {/* API Keys Card */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                API Credentials (মোবাইল অ্যাপ কানেক্ট করতে)
              </h3>
              <button 
                disabled={loading}
                onClick={handleRegenerateKeys}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-all disabled:opacity-50"
              >
                <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                Regenerate Keys
              </button>
            </div>

            {!profile?.apiKey ? (
              <div className="p-10 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">আপনার এখনো কোন এপিআই কি নেই</h4>
                <p className="text-xs text-gray-500 mb-6 max-w-sm mx-auto">মোবাইল অ্যাপের মাধ্যমে এসএমএস ট্র্যাক করতে এবং আপনার ওয়েবসাইটের সাথে কানেক্ট করতে এপিআই কি প্রয়োজন।</p>
                <button 
                  onClick={handleRegenerateKeys}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto"
                >
                  {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  জেনারেশন শুরু করুন
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Public API Key (API_KEY)</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-mono text-gray-600 select-all">
                      {profile.apiKey}
                    </div>
                    <button 
                      onClick={() => handleCopy(profile.apiKey!, 'key')}
                      className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl border border-gray-100 transition-all active:scale-95"
                    >
                      {copied === 'key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Secret API Key (API_SECRET)</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-mono text-gray-600 select-all">
                      {profile.apiSecret}
                    </div>
                    <button 
                      onClick={() => handleCopy(profile.apiSecret!, 'secret')}
                      className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl border border-gray-100 transition-all active:scale-95"
                    >
                      {copied === 'secret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-500" />
                    Integration Snippet
                  </h4>
                  <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto text-[11px] font-mono leading-relaxed group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-500">cURL / Website Deposit</span>
                      <button 
                        onClick={() => handleCopy(`curl -X POST ${window.location.origin}/api/v1/deposit-request \\\n -H "Content-Type: application/json" \\\n -d '{"apiKey": "${profile.apiKey}", "amount": 500, "externalId": "order_123"}'`, 'curl')}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all"
                      >
                        {copied === 'curl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <code className="text-emerald-400">
                      {`curl -X POST ${window.location.origin}/api/v1/deposit-request \\`}
                      <br />
                      {`  -H "Content-Type: application/json" \\`}
                      <br />
                      {`  -d '{"apiKey": "${profile.apiKey}", "amount": 500, "externalId": "order_123"}'`}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Sandbox */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              AI Extraction Test
            </h3>
            <p className="text-sm text-gray-500 mb-6">Test how our AI engine parses different SMS formats.</p>
            
            <div className="space-y-4">
              <textarea 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm min-h-[100px] outline-hidden focus:ring-1 focus:ring-blue-500"
                placeholder="Paste an SMS here (e.g. You have received tk 500...)"
                value={testSms}
                onChange={(e) => setTestSms(e.target.value)}
              />
              <button 
                onClick={handleTestAi}
                disabled={aiLoading || !testSms}
                className="px-6 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {aiLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Run AI Parser
              </button>

              {aiResult && (
                <div className="p-4 bg-gray-900 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto">
                  <pre>{JSON.stringify(aiResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Plan Card */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-fit sticky top-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            Subscription
          </h3>
          
          <div className="p-6 bg-gradient-to-br from-blue-600/10 to-blue-600/5 rounded-2xl border border-blue-100 mb-8 relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-white px-2 py-0.5 rounded-full mb-4 inline-block">
                Current Plan
              </span>
              <div className="text-3xl font-black text-gray-900 capitalize mb-1">{profile?.plan}</div>
              <p className="text-xs text-gray-500 font-medium">Valid until Forever</p>
            </div>
            <Lock className="absolute -right-4 -bottom-4 w-24 h-24 text-blue-600 opacity-5 -rotate-12 group-hover:rotate-0 transition-all duration-700" />
          </div>

          <ul className="space-y-4 mb-8">
            <PlanItem label="1 Connected Device" active={profile?.plan === 'free'} />
            <PlanItem label="Basic Dashboard" active={profile?.plan === 'free'} />
            <PlanItem label="API Access" active={profile?.plan === 'free'} />
            <PlanItem label="Email Support" active={profile?.plan === 'free'} />
            <PlanItem label="Custom Webhooks" active={profile?.plan !== 'free'} />
            <PlanItem label="Unlimited Devices" active={profile?.plan === 'business'} />
          </ul>

          <button 
            onClick={onShowUpgrade}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-xl hover:bg-black transition-all"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
      {/* Mobile App Setup Guide */}
      <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-100 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
          <Smartphone className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Mobile App Setup</h3>
          <p className="text-blue-100 text-sm mb-6 max-w-md">কানেক্টেড ডিভাইস থেকে এসএমএস রিড করার জন্য নিচের এপিআই কনফিগুরেশন আপনার অ্যান্ড্রয়েড অ্যাপে ব্যবহার করুন।</p>
          
          <div className="space-y-4">
            <div className="bg-blue-700/50 p-4 rounded-xl border border-blue-500/30">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">API Endpoint (Use this in Mobile App)</p>
              <code className="text-xs break-all font-mono">{window.location.origin}/api/v1/devices/connect</code>
              <p className="text-[9px] text-blue-200 mt-2">Note: Ensure your app uses this exact URL for connection.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-blue-700/50 p-4 rounded-xl border border-blue-500/30">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Method</p>
                <code className="text-xs font-mono">POST (application/json)</code>
              </div>
              <div className="bg-blue-700/50 p-4 rounded-xl border border-blue-500/30">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Auth Type</p>
                <code className="text-xs font-mono">API Key & Secret</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanItem({ label, active }: { label: string, active: boolean }) {
  return (
    <li className={cn("flex items-center gap-3 text-sm", active ? "text-gray-900" : "text-gray-400 line-through opacity-50")}>
      <div className={cn("w-4 h-4 rounded-full flex items-center justify-center", active ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400")}>
        <Check className="w-2.5 h-2.5" />
      </div>
      <span className="font-medium">{label}</span>
    </li>
  );
}
