import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Transaction, Device, DepositRequest, PlanDefinition, SystemConfig, RawSMS } from '../types';
import { transactionService, deviceService, depositService } from '../lib/services';
import Overview from './Overview';
import TransactionsList from './TransactionsList';
import DeviceManager from './DeviceManager';
import SettingsPanel from './SettingsPanel';
import Billing from './Billing';
import MyDeposits from './MyDeposits';
import UserAllLogs from './UserAllLogs';
import IntegrationGuide from './IntegrationGuide';
import AdminDeposits from './AdminDeposits';
import AdminSystemConfig from './AdminSystemConfig';
import AdminPlans from './AdminPlans';
import AdminUsers from './AdminUsers';
import AdminAllDevices from './AdminAllDevices';
import AdminAllLogs from './AdminAllLogs';
import { cn, generateApiKey, generateApiSecret } from '../lib/utils';
import { 
  LayoutDashboard, 
  ListOrdered, 
  Smartphone, 
  Settings, 
  LogOut,
  Bell,
  Search,
  User as UserIcon,
  CreditCard,
  Plus,
  X,
  Check,
  ShieldCheck,
  QrCode,
  Wallet,
  Globe,
  Zap,
  Users,
  History,
  Activity,
  Code2
} from 'lucide-react';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, getDoc, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

type Tab = 'overview' | 'transactions' | 'logs' | 'integration' | 'billing' | 'deposits' | 'devices' | 'settings' | 'admin-deposits' | 'admin-config' | 'admin-plans' | 'admin-users' | 'admin-devices' | 'admin-history';

interface DashboardProps {
  user: User;
  profile: UserProfile | null;
  onLogout: () => void;
  onRefreshProfile: () => Promise<void>;
}

export default function Dashboard({ user, profile, onLogout, onRefreshProfile }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [rawSMS, setRawSMS] = useState<RawSMS[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(query(collection(db, 'raw_sms'), where('userId', '==', profile.id), limit(100)), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as RawSMS));
      // Sort client-side
      docs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRawSMS(docs.slice(0, 50));
    });
    return unsub;
  }, [profile]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'config'));
        if (snap.exists()) {
          setSystemConfig(snap.data() as SystemConfig);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchConfig();
  }, []);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<PlanDefinition[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'plans'), orderBy('order', 'asc')), (snap) => {
      setAvailablePlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlanDefinition)));
    });
    return unsub;
  }, []);

  const handleAddDevice = async () => {
    if (!profile || !newDeviceName || !apiKeyInput || !secretKeyInput) {
      alert('Please fill all fields');
      return;
    }

    // 1. Check Plan Expiry
    if (profile.planExpiry) {
      const expiry = new Date(profile.planExpiry);
      if (expiry < new Date()) {
        alert('আপনার প্যাকেজের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে রিনিউ করুন।');
        setShowUpgradeModal(true);
        return;
      }
    }

    // 2. Check Device Limit (Admins have unlimited)
    const isAdmin = profile.role === 'admin';
    const maxDevices = profile.planDeviceLimit || 1; 
    if (!isAdmin && devices.length >= maxDevices) {
      alert(`আপনার প্যাকেজের ডিভাইস লিমিট (${maxDevices}) শেষ হয়ে গেছে। আরও ডিভাইস কানেক্ট করতে প্যাকেজ আপগ্রেড করুন।`);
      setShowUpgradeModal(true);
      return;
    }

    // 3. Handle multiple API keys: find if input matches any active key
    const apiKeysSnap = await getDocs(query(
      collection(db, 'api_keys'),
      where('userId', '==', profile.id),
      where('apiKey', '==', apiKeyInput),
      where('apiSecret', '==', secretKeyInput),
      limit(1)
    ));

    const isSecondaryKeyValid = !apiKeysSnap.empty;
    const isMasterKeyValid = (apiKeyInput === profile.apiKey && secretKeyInput === profile.apiSecret);

    if (!isSecondaryKeyValid && !isMasterKeyValid) {
      alert('Invalid API Key or Secret Key. Please check your credentials in Settings.');
      return;
    }

    try {
      await addDoc(collection(db, 'devices'), {
        userId: profile.id,
        deviceName: newDeviceName,
        deviceToken: generateApiKey().substring(0, 16),
        status: 'online', // Set to online for connection simulation
        lastSeen: new Date().toISOString()
      });
      setShowAddDeviceModal(false);
      setNewDeviceName('');
      setApiKeyInput('');
      setSecretKeyInput('');
    } catch (e) {
      console.error(e);
      alert('Failed to connect device');
    }
  };

  const ensureApiKeys = async () => {
    if (!profile) return;
    if (!profile.apiKey || !profile.apiSecret) {
      try {
        const keys = {
          apiKey: generateApiKey(),
          apiSecret: generateApiSecret()
        };
        await updateDoc(doc(db, 'users', profile.id), keys);
        await onRefreshProfile();
      } catch (e) {
        console.error("Error auto-generating keys:", e);
      }
    }
    setShowAddDeviceModal(true);
  };

  const handleUpgrade = async (planDef: PlanDefinition) => {
    if (!profile) return;
    
    const userBalance = profile.balance || 0;
    if (userBalance < planDef.price) {
      alert(`আপনার পর্যাপ্ত ব্যালেন্স নেই। অনুগ্রহ করে ${planDef.price - userBalance} TK ডিপোজিট করুন।`);
      setActiveTab('billing');
      setShowUpgradeModal(false);
      return;
    }

    if (!confirm(`${planDef.name} প্যাকেজটি ${planDef.price} TK দিয়ে কিনতে চান?`)) return;

    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (planDef.durationDays || 30));

      await updateDoc(doc(db, 'users', profile.id), { 
        plan: planDef.name.toLowerCase(),
        planExpiry: expiryDate.toISOString(),
        planDeviceLimit: planDef.deviceLimit || 1,
        planApiKeyLimit: planDef.apiKeyLimit || 1,
        balance: userBalance - planDef.price
      });
      await onRefreshProfile();
      setShowUpgradeModal(false);
      alert(`${planDef.name} প্যাকেজটি সফলভাবে একটিভ করা হয়েছে। মেয়াদ: ${expiryDate.toLocaleDateString()}`);
    } catch (e) {
      console.error(e);
      alert("প্যাকেজ আপডেট করতে সমস্যা হয়েছে।");
    }
  };

  useEffect(() => {
    if (!profile) return;
    
    const unsubTx = transactionService.subscribeToTransactions(profile.id, setTransactions);
    const unsubDv = deviceService.subscribeToDevices(profile.id, setDevices);
    const unsubDr = depositService.subscribeToRequests(profile.id, setDepositRequests);

    return () => {
      unsubTx();
      unsubDv();
      unsubDr();
    };
  }, [profile]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'History', icon: ListOrdered },
    { id: 'logs', label: 'Incoming Logs', icon: Activity },
    { id: 'integration', label: 'Integration', icon: Code2 },
    { id: 'billing', label: 'Add Funds', icon: CreditCard },
    { id: 'deposits', label: 'My Deposits', icon: Wallet },
    { id: 'devices', label: 'Devices', icon: Smartphone },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const adminNavItems = [
    { id: 'admin-users', label: 'User Control', icon: Users },
    { id: 'admin-deposits', label: 'Rev. Management', icon: Wallet },
    { id: 'admin-plans', label: 'Plan Config', icon: Zap },
    { id: 'admin-devices', label: 'Device Monitor', icon: Smartphone },
    { id: 'admin-history', label: 'System Logs', icon: History },
    { id: 'admin-config', label: 'Global Setup', icon: Globe },
  ] as const;

  const isAdmin = profile?.role === 'admin' || profile?.email === 'shahinkhan28p@gmail.com';
  const isAdminMode = isAdmin && activeTab.startsWith('admin-');
  const currentNavItems = isAdminMode ? adminNavItems : navItems;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 border-r border-gray-200 bg-white flex flex-col transition-all duration-300 lg:translate-x-0 lg:static lg:h-screen",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("p-6 flex items-center justify-between", isSidebarCollapsed && "px-4")}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-blue-600 p-2 rounded-lg shrink-0">
              <Smartphone className="text-white w-5 h-5" />
            </div>
            {!isSidebarCollapsed && (
              <span className="text-xl font-bold tracking-tight text-gray-900 truncate animate-in fade-in duration-300">SMSGate</span>
            )}
          </div>
          <button className="lg:hidden p-2 text-gray-400" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
          {!isSidebarOpen && (
            <button 
              className="hidden lg:flex p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors ml-2"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              <LayoutDashboard className={cn("w-4 h-4 transition-transform", isSidebarCollapsed ? "rotate-180" : "")} />
            </button>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {isAdminMode && (
            <div className={cn(
              "mb-4 bg-purple-600 rounded-xl text-white shadow-lg shadow-purple-100 flex items-center animate-in fade-in zoom-in duration-300",
              isSidebarCollapsed ? "p-3 justify-center" : "px-3 py-3 gap-3"
            )}>
              <ShieldCheck className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none">Admin Mode</p>
                  <p className="text-[8px] font-bold opacity-70 uppercase tracking-tighter mt-0.5 truncate">Control Terminal Active</p>
                </div>
              )}
            </div>
          )}

          {currentNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as Tab); setIsSidebarOpen(false); }}
              title={isSidebarCollapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center rounded-lg transition-all whitespace-nowrap overflow-hidden group",
                isSidebarCollapsed ? "px-0 justify-center h-10" : "px-3 py-2 gap-3",
                activeTab === item.id 
                  ? (isAdminMode ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", activeTab === item.id ? (isAdminMode ? "text-purple-600" : "text-blue-600") : "")} />
              {!isSidebarCollapsed && <span className="text-sm font-bold truncate transition-all duration-300">{item.label}</span>}
            </button>
          ))}

          {!isAdminMode && isAdmin && (
            <div className="pt-4 mt-4 border-t border-gray-100">
               <button
                onClick={() => setActiveTab('admin-users')}
                className={cn(
                  "w-full flex items-center rounded-xl transition-all whitespace-nowrap overflow-hidden bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100",
                  isSidebarCollapsed ? "px-0 justify-center h-10" : "px-3 py-2.5 gap-3"
                )}
                title="Admin Control"
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600" />
                {!isSidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-widest truncate">Admin Control</span>}
              </button>
            </div>
          )}
        </nav>

        <div className={cn("p-4 border-t border-gray-100", isSidebarCollapsed && "px-2")}>
          {isAdminMode ? (
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "w-full flex items-center justify-center bg-gray-900 text-white rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-200 mb-2",
                isSidebarCollapsed ? "p-3" : "gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest"
              )}
              title="Return to User Panel"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" /> 
              {!isSidebarCollapsed && <span className="truncate">Return to User</span>}
            </button>
          ) : (
            <div className={cn(
              "bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white overflow-hidden transition-all",
              isSidebarCollapsed ? "p-3" : "p-4"
            )}>
              <div className="flex items-center justify-between mb-2">
                {!isSidebarCollapsed && <span className="text-xs font-bold text-gray-400 uppercase tracking-widest truncate">{profile?.plan} Plan</span>}
                <CreditCard className="w-3 h-3 shrink-0" />
              </div>
              {!isSidebarCollapsed && <div className="text-[11px] font-medium mb-3 text-gray-300">Upgrade for more power</div>}
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className={cn(
                  "w-full bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center",
                  isSidebarCollapsed ? "p-2" : "py-2 text-xs font-bold"
                )}
                title="Upgrade Now"
              >
                {isSidebarCollapsed ? <Plus className="w-4 h-4" /> : "Upgrade Now"}
              </button>
            </div>
          )}

          <button 
            onClick={onLogout}
            className={cn(
              "w-full mt-4 flex items-center rounded-lg transition-all text-red-600 hover:bg-red-50",
              isSidebarCollapsed ? "px-0 justify-center h-10" : "px-3 py-2 gap-3 text-sm font-bold"
            )}
            title="Logout"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <LayoutDashboard className="w-6 h-6" />
            </button>
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                className="w-full pl-10 pr-4 py-2 text-sm border-none bg-gray-50 rounded-lg focus:ring-1 focus:ring-blue-500 transition-all outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
              <Wallet className="w-4 h-4 shrink-0" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Balance: {profile?.balance || 0} TK</span>
            </div>

            <button className="relative text-gray-400 hover:text-gray-600 transition-colors hidden xs:block">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 pl-6 border-l border-gray-100 group cursor-pointer"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{profile?.name}</div>
                  <div className="text-xs text-gray-500">{profile?.plan} Plan</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 border-2 border-transparent group-hover:border-blue-200 transition-all">
                  <UserIcon className="w-5 h-5" />
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account</p>
                  </div>
                  
                  <button onClick={() => { setActiveTab('settings'); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <UserIcon className="w-4 h-4" /> Profile Details
                  </button>
                  <button onClick={() => { setActiveTab('billing'); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Billing & Deposit
                  </button>
                  <button onClick={() => { setActiveTab('settings'); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <QrCode className="w-4 h-4" /> API Settings
                  </button>

                  {(profile?.role === 'admin' || profile?.email === 'shahinkhan28p@gmail.com') && (
                    <button 
                      onClick={() => { setActiveTab('admin-users'); setShowProfileMenu(false); }} 
                      className="w-full text-left px-4 py-2 text-sm font-bold text-purple-600 hover:bg-purple-50 flex items-center gap-2 border-t border-gray-50 mt-1 pt-1 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" /> Admin Panel (এডমিন প্যানেল)
                    </button>
                  )}
                  
                  <div className="border-t border-gray-50 mt-1 pt-1">
                    <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
            
            {activeTab === 'overview' && systemConfig?.announcement && (
              <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-200">System Announcement</div>
                    <div className="text-sm font-bold leading-tight">{systemConfig.announcement}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  {activeTab === 'overview' && 'Dashboard Overview'}
                  {activeTab === 'transactions' && 'Transaction History'}
                  {activeTab === 'billing' && 'Deposit Funds'}
                  {activeTab === 'deposits' && 'My Deposits'}
                  {activeTab === 'devices' && 'Connected Devices'}
                  {activeTab === 'settings' && 'Account Settings'}
                  {activeTab === 'admin-deposits' && 'Fund Management'}
                  {activeTab === 'admin-config' && 'System Configuration'}
                  {activeTab === 'admin-plans' && 'Subscription Plans'}
                  {activeTab === 'admin-users' && 'User Management'}
                  {activeTab === 'admin-devices' && 'All Device Settings'}
                  {activeTab === 'admin-history' && 'Platform History'}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {activeTab === 'overview' && 'View your revenue and growth trends.'}
                  {activeTab === 'transactions' && 'A detailed log of all processed payments.'}
                  {activeTab === 'billing' && 'Add funds to your wallet using mobile money.'}
                  {activeTab === 'deposits' && 'View status of your deposit requests.'}
                  {activeTab === 'devices' && 'Management of your Android SMS gateways.'}
                  {activeTab === 'settings' && 'Manage your API keys and profile.'}
                  {activeTab === 'admin-deposits' && 'Approve or reject user deposit requests.'}
                  {activeTab === 'admin-config' && 'Update payment numbers and system settings.'}
                  {activeTab === 'admin-plans' && 'Add, edit or remove subscription plans.'}
                  {activeTab === 'admin-users' && 'Manage user accounts and status.'}
                  {activeTab === 'admin-devices' && 'Monitor and manage all active gateway devices.'}
                  {activeTab === 'admin-history' && 'Track all transactions and activities.'}
                </p>
              </div>

              {activeTab.startsWith('admin-') && (
                <button 
                  onClick={() => setActiveTab('overview')}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 shadow-xl shadow-gray-200 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:-translate-y-0.5 transition-all w-full sm:w-auto"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Exit Admin Panel
                </button>
              )}
              
              {activeTab === 'devices' && (
                <button 
                  onClick={ensureApiKeys}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all"
                >
                  <Smartphone className="w-4 h-4" />
                  Connect Device
                </button>
              )}
            </div>

            {activeTab === 'overview' && (
              <Overview 
                transactions={transactions} 
                devices={devices} 
                profile={profile} 
                depositRequests={depositRequests}
                rawSMS={rawSMS}
              />
            )}
            {activeTab === 'transactions' && (
              <TransactionsList transactions={transactions} depositRequests={depositRequests} rawSMS={rawSMS} />
            )}
            {activeTab === 'logs' && (
              <UserAllLogs logs={rawSMS} loading={false} />
            )}
            {activeTab === 'integration' && (
              <IntegrationGuide apiKey={profile?.apiKey || ''} apiSecret={profile?.apiSecret || ''} />
            )}
            {activeTab === 'billing' && (
              <Billing profile={profile} onUpgrade={() => setShowUpgradeModal(true)} />
            )}
            {activeTab === 'deposits' && (
              <MyDeposits profile={profile} />
            )}
            {activeTab === 'admin-deposits' && isAdmin && (
              <AdminDeposits />
            )}
            {activeTab === 'admin-plans' && isAdmin && (
              <AdminPlans />
            )}
            {activeTab === 'admin-users' && isAdmin && (
              <AdminUsers />
            )}
            {activeTab === 'admin-devices' && isAdmin && (
              <AdminAllDevices />
            )}
            {activeTab === 'admin-history' && isAdmin && (
              <AdminAllLogs />
            )}
            {activeTab === 'admin-config' && isAdmin && (
              <AdminSystemConfig />
            )}
            {activeTab === 'devices' && (
              <DeviceManager 
                devices={devices} 
                userId={profile?.id || ''} 
                onShowAddDevice={() => setShowAddDeviceModal(true)} 
              />
            )}
            {activeTab === 'settings' && (
              <SettingsPanel 
                profile={profile} 
                onRefresh={onRefreshProfile} 
                onShowUpgrade={() => setShowUpgradeModal(true)}
              />
            )}
          </div>
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
              <div className="md:w-1/3 bg-blue-600 p-10 text-white flex flex-col justify-between">
                <div>
                  <ShieldCheck className="w-12 h-12 mb-6" />
                  <h3 className="text-3xl font-black mb-4">Choose Your Power.</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">Unlock unlimited devices, priority support, and custom webhooks for your growing business.</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-bold text-blue-200">
                    <Check className="w-4 h-4" /> 24/7 Priority Support
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-blue-200">
                    <Check className="w-4 h-4" /> Unlimited API Calls
                  </div>
                </div>
              </div>

              <div className="flex-1 p-10 relative">
                <button onClick={() => setShowUpgradeModal(false)} className="absolute right-6 top-6 text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
                
                <h4 className="text-xl font-bold mb-8 text-gray-900">Select a Plan</h4>
                <div className="grid sm:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto pr-2">
                  {availablePlans.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-400">Loading plans...</div>
                  ) : (
                    availablePlans.map((p, i) => (
                      <div key={i} className={cn(
                        "p-6 rounded-2xl border-2 transition-all cursor-pointer hover:scale-[1.02]",
                        p.isPopular ? "border-blue-600 bg-blue-50/50" : "border-gray-100 hover:border-blue-200"
                      )}>
                        {p.isPopular && <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mb-3 inline-block">Most Popular</span>}
                        {p.badge && !p.isPopular && <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mb-3 inline-block">{p.badge}</span>}
                        <div className="text-lg font-bold text-gray-900">{p.name}</div>
                        <div className="text-3xl font-black text-gray-900 mt-2">৳{p.price}<span className="text-xs text-gray-500 font-medium">/mo</span></div>
                        <ul className="mt-6 space-y-3">
                          {p.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs font-medium text-gray-600">
                              <Check className="w-3.5 h-3.5 text-blue-600" /> {feature}
                            </li>
                          ))}
                        </ul>
                        <button 
                          onClick={() => handleUpgrade(p)}
                          className={cn(
                            "w-full mt-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md",
                            p.isPopular ? "bg-blue-600 text-white shadow-blue-100" : "bg-gray-100 text-gray-900"
                          )}
                        >
                          Choose {p.name}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Device Modal */}
        {showAddDeviceModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 shadow-2xl relative">
              <button 
                onClick={() => {
                  setShowAddDeviceModal(false);
                  setNewDeviceName('');
                  setApiKeyInput('');
                  setSecretKeyInput('');
                }} 
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Connect New Device</h3>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Enter your device name and authenticate using your API credentials to establish a secure connection.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Device Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    placeholder="e.g. Samsung Galaxy S22"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all text-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">API Key</label>
                    {profile?.apiKey && (
                      <button 
                        onClick={() => setShowKeys(!showKeys)}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        {showKeys ? 'Hide Keys' : 'Show My Keys'}
                      </button>
                    )}
                  </div>
                  <input 
                    type="password" 
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter your Public API Key"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all text-sm font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Secret Key</label>
                  <input 
                    type="password" 
                    value={secretKeyInput}
                    onChange={(e) => setSecretKeyInput(e.target.value)}
                    placeholder="Enter your Secret Key"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all text-sm font-mono"
                  />
                </div>

                {showKeys && profile && (
                  <div className="p-4 bg-gray-900 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Your API Key</p>
                      <code className="text-[10px] text-emerald-400 font-mono break-all bg-emerald-400/10 px-2 py-1 rounded select-all block">{profile.apiKey}</code>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Your Secret Key</p>
                      <code className="text-[10px] text-orange-400 font-mono break-all bg-orange-400/10 px-2 py-1 rounded select-all block">{profile.apiSecret}</code>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setShowAddDeviceModal(false);
                      setNewDeviceName('');
                      setApiKeyInput('');
                      setSecretKeyInput('');
                    }}
                    className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddDevice}
                    disabled={!newDeviceName || !apiKeyInput || !secretKeyInput}
                    className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Connect Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
