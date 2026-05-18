import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { Users, ShieldCheck, Mail, Calendar, Search, Loader2, UserX, UserCheck, Wallet, Zap } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFormData, setEditFormData] = useState({
    balance: 0,
    plan: 'free',
    planDeviceLimit: 1,
    planExpiry: '',
    status: 'active'
  });

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
      // Client-side sort
      docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setUsers(docs);
      setLoading(false);
    });
    return unsub;
  }, []);

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setEditFormData({
      balance: user.balance || 0,
      plan: user.plan || 'free',
      planDeviceLimit: user.planDeviceLimit || 1,
      planExpiry: user.planExpiry ? user.planExpiry.substring(0, 10) : '',
      status: user.status || 'active'
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setProcessingId(editingUser.id);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        ...editFormData,
        planExpiry: editFormData.planExpiry ? new Date(editFormData.planExpiry).toISOString() : null
      });
      setEditingUser(null);
    } catch (e) {
      console.error(e);
      alert("Update failed");
    } finally {
      setProcessingId(null);
    }
  };

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = (currentStatus === 'suspended' || currentStatus === 'inactive') ? 'active' : 'suspended';
    if (!confirm(`Are you sure you want to change user status to ${nextStatus}?`)) return;
    
    setProcessingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { status: nextStatus });
    } catch (e) {
      console.error(e);
      alert("Status update failed");
    } finally {
      setProcessingId(null);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change user role to ${newRole}?`)) return;
    
    setProcessingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (e) {
      console.error(e);
      alert("Role update failed");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Quick Access Control */}
      <div className="bg-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-purple-100 flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-purple-100">User Identification (UID/Email)</label>
          <input 
            type="text" 
            id="quick-uid"
            placeholder="Search by ID or Email..."
            className="w-full h-11 px-4 bg-purple-700/50 border border-purple-500/50 rounded-xl text-white placeholder:text-purple-300 text-sm outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
        <div className="w-full md:w-48 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-purple-100">Target Level</label>
          <select 
            id="quick-role"
            className="w-full h-11 px-4 bg-purple-700/50 border border-purple-500/50 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-white/20"
          >
            <option value="user">Standard User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <button 
          onClick={async () => {
            const input = document.getElementById('quick-uid') as HTMLInputElement;
            const roleSelect = document.getElementById('quick-role') as HTMLSelectElement;
            const target = input.value.trim();
            const role = roleSelect.value;
            
            if (!target) return;

            // Find user by email or ID in the current list
            const foundUser = users.find(u => u.id === target || u.email === target);
            if (foundUser) {
              await updateRole(foundUser.id, role);
              input.value = '';
            } else {
              alert("User not found in currently loaded list. Please use the exact User ID.");
            }
          }}
          className="h-11 px-8 bg-white text-purple-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-purple-50 transition-all shadow-sm"
        >
          Assign Now
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-xl">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">User Management</h3>
            <p className="text-sm text-gray-500">Manage all registered users and their permissions.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name, email or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none w-full sm:w-64"
          />
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Users</div>
          <div className="text-2xl font-black text-gray-900">{users.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active</div>
          <div className="text-2xl font-black text-emerald-600">{users.filter(u => u.status !== 'suspended' && u.status !== 'inactive').length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Premium</div>
          <div className="text-2xl font-black text-blue-600">{users.filter(u => u.plan !== 'free').length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Balance</div>
          <div className="text-2xl font-black text-amber-600">৳{users.reduce((acc, u) => acc + (u.balance || 0), 0)}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Profile</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan & Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                        {u.name?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 flex items-center gap-1">
                          {u.name}
                          {u.role === 'admin' && <ShieldCheck className="w-3 h-3 text-purple-600" />}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <select 
                        value={u.role || 'user'}
                        disabled={processingId === u.id}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex w-fit outline-none cursor-pointer border-none",
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'moderator' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex w-fit",
                        (u.status === 'suspended' || u.status === 'inactive') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      )}>
                        {u.status || 'active'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-gray-900 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      {u.balance || 0} TK
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {u.createdAt ? format(new Date(u.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(u)}
                        className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                        title="Edit User"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleStatus(u.id, u.status || 'active')}
                        disabled={processingId === u.id}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          (u.status === 'suspended' || u.status === 'inactive') 
                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        )}
                        title={(u.status === 'suspended' || u.status === 'inactive') ? 'Activate User' : 'Deactivate User'}
                      >
                        {processingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (u.status === 'suspended' || u.status === 'inactive') ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 shadow-2xl relative">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Edit User: {editingUser.name}</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Balance (TK)</label>
                  <input 
                    type="number" 
                    value={editFormData.balance}
                    onChange={(e) => setEditFormData({...editFormData, balance: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Device Limit</label>
                  <input 
                    type="number" 
                    value={editFormData.planDeviceLimit}
                    onChange={(e) => setEditFormData({...editFormData, planDeviceLimit: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Plan Name</label>
                <input 
                  type="text" 
                  value={editFormData.plan}
                  onChange={(e) => setEditFormData({...editFormData, plan: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Expiry Date</label>
                <input 
                  type="date" 
                  value={editFormData.planExpiry}
                  onChange={(e) => setEditFormData({...editFormData, planExpiry: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-6">
                <button 
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateUser}
                  disabled={processingId === editingUser.id}
                  className="flex-1 py-3 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-lg shadow-purple-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === editingUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
