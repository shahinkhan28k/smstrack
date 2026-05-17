import React from 'react';
import { Copy, Zap, ArrowUpRight, BellRing, Info, CheckCircle2, Globe, Layout, ShieldCheck } from 'lucide-react';

export default function IntegrationGuide({ apiKey, apiSecret }: { apiKey: string, apiSecret: string }) {
  const baseUrl = window.location.origin;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-5xl">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
        <div className="relative z-10">
          <div className="bg-white/20 w-fit p-3 rounded-2xl backdrop-blur-md mb-6">
            <Zap className="w-8 h-8 text-yellow-300 fill-yellow-300" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Universal Payment Gateway</h2>
          <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
            আপনার নিজস্ব পেমেন্ট গেটওয়ে এখন তৈরি! যেকোনো ওয়েবসাইট বা অ্যাপের সাথে ৪টি সহজ ধাপে ইন্টিগ্রেট করুন।
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 -translate-y-20 blur-3xl"></div>
      </div>

      {/* API Credentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Public API Key</label>
          <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 font-mono text-sm">
            <span className="truncate flex-1 text-gray-600">{apiKey}</span>
            <button onClick={() => copyToClipboard(apiKey)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Secret Key</label>
          <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 font-mono text-sm">
            <span className="truncate flex-1 text-gray-600">{apiSecret}</span>
            <button onClick={() => copyToClipboard(apiSecret)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="space-y-12">
        {/* Method 1: Hosted Checkout */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Layout className="w-5 h-5 text-indigo-600" />
            </div>
            <h4 className="font-black text-gray-900">পদ্ধতি ১: হোস্টেড চেকআউট (Hosted Checkout)</h4>
          </div>
          <p className="text-sm text-gray-600 px-2 leading-relaxed">
            এটি সবচেয়ে সহজ পদ্ধতি। আপনি জাস্ট ইউজারকে আমাদের একটি পেমেন্ট লিঙ্কে পাঠিয়ে দেবেন। পেমেন্ট শেষ হলে ইউজার আপনার সাইটে ফিরে যাবে।
          </p>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase">Redirect URL Format:</span>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-mono text-xs text-blue-600 break-all">
                {baseUrl}/checkout/{"{requestId}"}
              </div>
            </div>
            <p className="text-[11px] text-gray-500 italic">
              * প্রথমে API দিয়ে একটি Deposit Request তৈরি করুন, তারপর প্রাপ্ত requestId ব্যবহার করে ইউজারকে রিডাইরেক্ট করুন।
            </p>
          </div>
        </section>

        {/* Method 2: API Request */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
            </div>
            <h4 className="font-black text-gray-900">ধাপ ২: এপিআই রিকোয়েস্ট (Create Request)</h4>
          </div>
          <div className="bg-gray-900 rounded-[2rem] overflow-hidden shadow-xl">
            <div className="bg-gray-800/50 px-6 py-4 flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">PHP / Curl</span>
            </div>
            <pre className="p-6 text-sm font-mono overflow-x-auto text-blue-300">
{`<?php
$data = [
    "apiKey" => "${apiKey}",
    "amount" => 1000,
    "provider" => "bKash",
    "externalId" => "ORDER_123", // আপনার সাইটের অর্ডার আইডি
    "webhookUrl" => "https://your-site.com/callback"
];

$ch = curl_init("${baseUrl}/api/v1/deposit-request");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
$result = json_decode($response, true);

// Hosted Checkout এ পাঠাতে হলে:
header("Location: ${baseUrl}/checkout/" . $result['requestId']);
?>`}
            </pre>
          </div>
        </section>

        {/* Webhook */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-amber-100 rounded-xl">
              <BellRing className="w-5 h-5 text-amber-600" />
            </div>
            <h4 className="font-black text-gray-900">ধাপ ৪: ওয়েব হুক (Webhook)</h4>
          </div>
          <div className="bg-gray-900 rounded-[2rem] overflow-hidden shadow-xl">
            <pre className="p-6 text-sm font-mono overflow-x-auto text-emerald-300">
{`<?php
// রিসিভ করুন
$data = json_decode(file_get_contents('php://input'), true);
$secret = $_SERVER['HTTP_X_GATEWAY_SECRET'];

if ($secret === "${apiSecret}" && $data['event'] == 'payment.confirmed') {
    // পেমেন্ট কনফার্ম! এবার আপনার সাইটে একশন নিন
    $orderId = $data['externalId'];
    error_log("Order $orderId is now PAID");
}
?>`}
            </pre>
          </div>
        </section>
      </div>

      {/* Security Footer */}
      <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 flex gap-4">
        <div className="bg-emerald-100 p-4 rounded-2xl h-fit">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h4 className="font-bold text-emerald-900">Security Verification</h4>
          <p className="text-sm text-emerald-800 leading-relaxed mt-1">
            আপনার সাইটে ডেটা রিসিভ করার সময় অবশ্যই <b>X-Gateway-Secret</b> হেডার চেক করবেন। 
            এটি নিশ্চিত করে যে ডেটা আমাদের সার্ভার থেকেই এসেছে।
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center pt-8 opacity-50">
        <Globe className="w-12 h-12 text-gray-300" />
      </div>
    </div>
  );
}
