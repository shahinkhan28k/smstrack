import React from 'react';
import { 
  BarChart3, 
  Smartphone, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Lock
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Smartphone className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight">SMSGate</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <a href="#features" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors hidden xs:block">Features</a>
          <button 
            onClick={onLogin}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Login
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="px-4 sm:px-6 pt-12 sm:pt-20 pb-20 sm:pb-32 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider">
            Now with AI-Powered Extraction
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-gray-900 max-w-4xl mx-auto leading-[1.1]">
            Turn your Android phone into a <span className="text-blue-600">Payment Gateway.</span>
          </h1>
          <p className="mt-6 sm:mt-8 text-base sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Automatically track bKash, Nagad, and Rocket transactions from your phone. 
            Real-time API sync, detailed analytics, and webhook support for your business.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group shadow-xl"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border border-gray-200 rounded-xl font-bold text-lg hover:border-gray-300 transition-all">
              View Documentation
            </button>
          </div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-20 relative px-4"
        >
          <div className="bg-gray-900 rounded-2xl p-4 shadow-2xl overflow-hidden border border-gray-800 max-w-5xl mx-auto">
            <div className="flex gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000" 
              alt="Dashboard Preview" 
              className="rounded-lg opacity-90"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl h-40 bg-white/20 backdrop-blur-3xl rounded-full blur-3xl -z-10"></div>
        </motion.div>
      </header>

      {/* Features */}
      <section id="features" className="py-24 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Everything you need to automate payments</h2>
            <p className="mt-4 text-lg text-gray-600">Scale your business with our robust SMS gateway infrastructure.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: Zap, 
                title: "Instant Sync", 
                desc: "SMS data is extracted and sent to your dashboard within milliseconds of arrival.",
                color: "bg-amber-50 text-amber-600"
              },
              { 
                icon: ShieldCheck, 
                title: "Bank-Grade Security", 
                desc: "End-to-end encryption for all transaction data. Your security is our priority.",
                color: "bg-blue-50 text-blue-600"
              },
              { 
                icon: BarChart3, 
                title: "Deep Analytics", 
                desc: "Visualize your revenue growth with detailed charts and transaction reports.",
                color: "bg-emerald-50 text-emerald-600"
              },
              { 
                icon: MessageSquare, 
                title: "Universal Support", 
                desc: "Compatible with bKash, Nagad, Rocket, Upay, and all major mobile operators.",
                color: "bg-indigo-50 text-indigo-600"
              },
              { 
                icon: Lock, 
                title: "API First", 
                desc: "Integrate with your existing website or app using our simple REST API.",
                color: "bg-purple-50 text-purple-600"
              },
              { 
                icon: TrendingUp, 
                title: "Multi-Device", 
                desc: "Connect multiple phones to a single account for high-volume businesses.",
                color: "bg-rose-50 text-rose-600"
              }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm"
              >
                <div className={`${f.color} w-12 h-12 rounded-xl flex items-center justify-center mb-6`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-sm text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <span className="text-gray-900 font-bold">SMSGate</span>
            <span>&copy; 2026. All rights reserved.</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-blue-600">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600">Terms of Service</a>
            <a href="#" className="hover:text-blue-600">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
