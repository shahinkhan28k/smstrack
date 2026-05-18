import React, { useState } from 'react';
import { Copy, Zap, ArrowUpRight, BellRing, Layout, ShieldCheck, Code, Globe, Terminal, Server, ExternalLink, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export default function IntegrationGuide({ apiKey, apiSecret }: { apiKey: string, apiSecret: string }) {
  const baseUrl = window.location.origin;
  const [activeTab, setActiveTab] = useState<'php' | 'laravel' | 'node' | 'js' | 'webhook'>('php');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const tabs = [
    { id: 'php', name: 'PHP / cURL', icon: Code },
    { id: 'laravel', name: 'Laravel', icon: Server },
    { id: 'node', name: 'Node.js', icon: Terminal },
    { id: 'js', name: 'JavaScript', icon: Globe },
    { id: 'webhook', name: 'Webhook', icon: BellRing },
  ];

  const codeSnippets = {
    php: `<?php
$data = [
    "apiKey" => "${apiKey}",
    "amount" => 500,
    "provider" => "bKash", // bKash, Nagad, Rocket
    "externalId" => "ORD-1001", // Your site order ID
    "webhookUrl" => "https://your-site.com/webhook"
];

$ch = curl_init("${baseUrl}/api/v1/deposit-request");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
$result = json_decode($response, true);

if ($result['success']) {
    // Redirect to Checkout URL
    header("Location: ${baseUrl}/checkout/" . $result['requestId']);
} else {
    echo "Error: " . $result['error'];
}
?>`,
    laravel: `// 1. Controller Code
public function pay(Request $request) {
    $response = Http::post('${baseUrl}/api/v1/deposit-request', [
        'apiKey' => '${apiKey}',
        'amount' => 500,
        'provider' => 'bKash',
        'externalId' => 'ORDER_ID_123',
        'webhookUrl' => route('payment.webhook'),
    ]);

    $data = $response->json();
    
    if ($data['success']) {
        return redirect("${baseUrl}/checkout/" . $data['requestId']);
    }
    
    return back()->with('error', $data['error']);
}

// 2. Webhook Handler
public function webhook(Request $request) {
    $secret = $request->header('X-Gateway-Secret');
    
    if ($secret !== '${apiSecret}') {
        return response()->json(['error' => 'Unauthorized'], 401);
    }

    $event = $request->input('event');
    if ($event === 'payment.confirmed') {
        $orderId = $request->input('externalId');
        // Update your database here
    }

    return response()->json(['status' => 'ok']);
}`,
    node: `const axios = require('axios');

async function createPayment() {
    try {
        const response = await axios.post('${baseUrl}/api/v1/deposit-request', {
            apiKey: '${apiKey}',
            amount: 500,
            provider: 'bKash',
            externalId: 'ORD_99',
            webhookUrl: 'https://mysite.com/api/payment-webhook'
        });

        if (response.data.success) {
            console.log('Redirect User to:', \`${baseUrl}/checkout/\${response.data.requestId}\`);
        }
    } catch (error) {
        console.error('Payment Error:', error.response?.data || error.message);
    }
}`,
    js: `// Using Fetch API (Client Side)
async function startPayment() {
    const res = await fetch('${baseUrl}/api/v1/deposit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            apiKey: '${apiKey}',
            amount: 500,
            provider: 'Nagad',
            externalId: 'TXN_JS_001'
        })
    });
    
    const data = await res.json();
    if (data.success) {
        window.location.href = \`${baseUrl}/checkout/\${data.requestId}\`;
    }
}`,
    webhook: `// Webhook Payload Structure (JSON)
{
  "event": "payment.confirmed",
  "success": true,
  "requestId": "dep_...",
  "externalId": "ORDER_123", // Your Order ID
  "amount": 500,
  "trxId": "ABC123XYZ", // The BKash/Nagad TrxID
  "sender": "017XXXXXXXX",
  "provider": "bKash",
  "timestamp": "2024-03-20T10:00:00Z",
  "note": "Payment verified"
}

// HEADER: X-Gateway-Secret: ${apiSecret}`
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-5xl">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-emerald-600 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-100">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Zap className="w-8 h-8 text-yellow-300 fill-yellow-300" />
            </div>
            <div className="bg-emerald-400/20 px-4 py-1 rounded-full backdrop-blur-md border border-white/20">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-100">Developer API</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight">Universal Payment<br />API Integration</h2>
          <p className="text-indigo-100 text-lg max-w-2xl leading-relaxed font-medium">
            যেকোনো ওয়েবসাইটের সাথে আমাদের এপিআই যুক্ত করুন খুব সহজে। আমরা সব ধরনের প্ল্যাটফর্ম যেমন Laravel, WordPress, Node.js সাপোর্ট করি।
          </p>
        </div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Quick Setup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
            { icon: Layout, title: "Checkout Page", desc: "Hosted Checkout Page for easy integration", color: "blue" },
            { icon: BellRing, title: "Webhooks", desc: "Real-time payment notifications", color: "emerald" },
            { icon: ShieldCheck, title: "Verified", desc: "Multi-layer security with API Secrets", color: "indigo" }
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 bg-${item.color}-50 rounded-2xl flex items-center justify-center mb-4`}>
              <item.icon className={`w-6 h-6 text-${item.color}-600`} />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
            <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* API Credentials */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 px-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            আপনার এপিআই ক্রেডেনশিয়াল
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 px-1">Public API Key</label>
            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 transition-colors group-hover:border-blue-200">
                <code className="truncate flex-1 text-gray-600 text-xs font-bold">{apiKey}</code>
                <button onClick={() => copyToClipboard(apiKey)} className="p-2 bg-white shadow-sm border border-gray-100 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors">
                <Copy className="w-4 h-4" />
                </button>
            </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 px-1">Secret Key / Webhook Key</label>
            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 transition-colors group-hover:border-blue-200">
                <code className="truncate flex-1 text-gray-600 text-xs font-bold">{apiSecret}</code>
                <button onClick={() => copyToClipboard(apiSecret)} className="p-2 bg-white shadow-sm border border-gray-100 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors">
                <Copy className="w-4 h-4" />
                </button>
            </div>
            </div>
        </div>
      </div>

      {/* Integration Steps */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <Code className="w-8 h-8 text-blue-600" />
                ইন্টিগ্রেশন গাইডলাইন
            </h3>
            <p className="text-gray-500 text-sm mt-1">সব ডিজাইন ও প্ল্যাটফর্মের জন্য প্রস্তুত করা কোড নিচে দেয়া হলো</p>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto p-4 gap-2 bg-gray-50/50 scrollbar-hide">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all",
                        activeTab === tab.id 
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                            : "bg-white text-gray-500 hover:bg-gray-100 shadow-sm"
                    )}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.name}
                </button>
            ))}
        </div>

        {/* Code Content */}
        <div className="p-6 md:p-10 bg-gray-950 min-h-[400px] relative">
            <button 
                onClick={() => copyToClipboard(codeSnippets[activeTab])}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all flex items-center gap-2 text-xs font-bold backdrop-blur-md"
            >
                <Copy className="w-4 h-4" />
                Copy Code
            </button>
            <pre className="text-sm font-mono leading-relaxed overflow-x-auto pb-6">
                <code className={cn(
                    "block",
                    activeTab === 'webhook' ? "text-amber-300" : "text-blue-300"
                )}>
                    {codeSnippets[activeTab]}
                </code>
            </pre>
        </div>
        
        <div className="p-8 bg-blue-50 border-t border-blue-100">
            <div className="flex gap-4 items-start">
                <div className="p-3 bg-blue-100 rounded-2xl">
                    <Info className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h4 className="font-black text-blue-900">কিভাবে কাজ করে?</h4>
                    <ul className="mt-2 space-y-2">
                        {[
                            "১. API দিয়ে পেমেন্ট রিকোয়েস্ট তৈরি করুন এবং requestId নিন।",
                            `২. আপনার ইউজারকে ${baseUrl}/checkout/{requestId} লিঙ্কে পাঠিয়ে দিন।`,
                            "৩. ইউজার পেমেন্ট করার পর তারা আপনার Webhook URL এ ডাটা পাবে।",
                            "৪. X-Gateway-Secret হেডার চেক করে পেমেন্ট ভেরিফাই করুন।"
                        ].map((step, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-blue-800 font-medium">
                                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                {step}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
      </div>

      {/* Direct Payment Button Example */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
            <h4 className="text-2xl font-black text-gray-900 mb-4">ওয়ার্ডপ্রেস ও এইচটিএমএল ইউজারদের জন্য</h4>
            <p className="text-gray-600 leading-relaxed mb-6">
                আপনি যদি লো-কোড সলিউশন খুঁজছেন, তবে নিচের বাটন কোডটি যেকোনো এইচটিএমএল ফাইলে যুক্ত করতে পারেন।
            </p>
            <div className="flex gap-3">
                <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:-translate-y-0.5 transition-all">
                    <ExternalLink className="w-4 h-4" />
                    ডকুমেন্টেশন ফাইল ডাউনলোড
                </button>
            </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-inner">
            <div className="bg-white p-4 rounded-xl border border-gray-200 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Demo Button</span>
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <button className="w-full py-4 bg-[#005cbb] text-white rounded-xl font-bold flex items-center justify-center gap-3">
                    <Zap className="w-5 h-5 fill-white" />
                    Pay with Smstrack Gateway
                </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center font-medium italic">
                * Just an illustration of how it looks on your site.
            </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center pt-8 opacity-40">
        <Globe className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Smstrack Developer Hub</p>
      </div>
    </div>
  );
}

