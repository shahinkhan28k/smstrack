import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Smartphone, 
  Clock,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';
import { Transaction, Device, UserProfile, DepositRequest } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';

interface OverviewProps {
  transactions: Transaction[];
  devices: Device[];
  profile: UserProfile | null;
  depositRequests: DepositRequest[];
}

export default function Overview({ transactions, devices, profile, depositRequests }: OverviewProps) {
  const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const activeDevices = devices.filter(d => d.status === 'online').length;
  const pendingRequests = depositRequests.filter(r => r.status === 'pending').length;
  const matchedRequests = depositRequests.filter(r => r.status === 'matched').length;
  
  // Data for Chart
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayTxs = transactions.filter(tx => isSameDay(new Date(tx.createdAt), date));
    return {
      name: format(date, 'MMM dd'),
      amount: dayTxs.reduce((sum, tx) => sum + tx.amount, 0)
    };
  });

  const stats = [
    { 
      label: 'Success Rate', 
      value: depositRequests.length > 0 ? `${Math.round((matchedRequests / depositRequests.length) * 100)}%` : '0%', 
      change: `${matchedRequests} Matched`, 
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    { 
      label: 'Pending Approval', 
      value: pendingRequests.toString(), 
      change: 'Awaiting SMS', 
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      label: 'Active Receivers', 
      value: `${activeDevices}`, 
      change: 'SMS Gateways', 
      icon: Smartphone,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    { 
      label: 'Total Payout', 
      value: formatCurrency(totalVolume), 
      change: 'API Volume', 
      icon: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} ${stat.color} p-2 rounded-lg`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-bold ${stat.color}`}>{stat.change}</span>
            </div>
            <div className="text-gray-500 text-sm font-medium">{stat.label}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Revenue Growth</h3>
              <p className="text-sm text-gray-500">Weekly transaction volume overview</p>
            </div>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Details <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748B' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748B' }} 
                  tickFormatter={(value) => `৳${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#2563EB" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Feed Miniature */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-6 flex-1 overflow-y-auto max-h-[300px] pr-2">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-gray-500 uppercase">{tx.provider.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate">{tx.sender}</div>
                  <div className="text-xs text-gray-500 line-clamp-1">{tx.message}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-600">+{tx.amount}</div>
                  <div className="text-[10px] text-gray-400 font-medium">{format(new Date(tx.createdAt), 'HH:mm')}</div>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-10" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
          <button className="mt-6 w-full py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all border border-gray-100 italic">
            See All Transactions
          </button>
        </div>
      </div>
    </div>
  );
}
