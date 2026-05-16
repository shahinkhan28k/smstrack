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
import { Transaction, Device, UserProfile, DepositRequest, RawSMS } from '../types';
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
  rawSMS?: RawSMS[];
}

export default function Overview({ transactions, devices, profile, depositRequests, rawSMS = [] }: OverviewProps) {
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
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Live Activity</h3>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span> Live
            </span>
          </div>
          
          <div className="space-y-6 flex-1 overflow-y-auto max-h-[350px] pr-2">
            {[...transactions, ...rawSMS.filter(s => !transactions.some(t => t.id === s.transactionId))]
              .sort((a, b) => {
                const timeA = 'timestamp' in a ? new Date(a.timestamp).getTime() : new Date(a.createdAt).getTime();
                const timeB = 'timestamp' in b ? new Date(b.timestamp).getTime() : new Date(b.createdAt).getTime();
                return timeB - timeA;
              })
              .slice(0, 10).map((activity) => {
                const isTransaction = 'amount' in activity;
                const activityTime = isTransaction 
                  ? (activity as Transaction).createdAt 
                  : (activity as RawSMS).timestamp;
                const activityMsg = isTransaction 
                  ? (activity as Transaction).message 
                  : (activity as RawSMS).message;
                const activitySender = isTransaction 
                  ? (activity as Transaction).provider 
                  : (activity as RawSMS).sender || "Unknown Sender";

                return (
                  <div key={activity.id} className="flex gap-4 group">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                      isTransaction ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"
                    )}>
                      {isTransaction ? <CheckCircle2 className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {activitySender}
                      </div>
                      <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5 leading-tight">
                        {activityMsg}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn(
                        "text-sm font-bold",
                        isTransaction ? "text-emerald-600" : "text-gray-400 italic"
                      )}>
                        {isTransaction ? `+${(activity as Transaction).amount}` : 'Raw SMS'}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold mt-0.5">
                        {format(new Date(activityTime), 'HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                );
              })}
            
            {transactions.length === 0 && rawSMS.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-10" />
                <p className="text-sm">No recent activity detected</p>
                <p className="text-[10px] mt-2">Connecting a device will start the stream.</p>
              </div>
            )}
          </div>
          
          <button className="mt-6 w-full py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-blue-100 border-dashed">
            View All Logs
          </button>
        </div>
      </div>
    </div>
  );
}
