import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PlanDefinition } from '../types';
import { Plus, Trash2, Edit2, Save, X, Loader2, Zap, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AdminPlans() {
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState<Partial<PlanDefinition>>({
    name: '',
    price: 0,
    features: [],
    badge: '',
    isPopular: false,
    order: 0
  });

  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'plans'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlanDefinition)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSave = async (id?: string) => {
    const planId = id || Math.random().toString(36).substring(7);
    try {
      await setDoc(doc(db, 'plans', planId), formData, { merge: true });
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', price: 0, features: [], badge: '', isPopular: false, order: 0 });
    } catch (e) {
      console.error(e);
      alert("Error saving plan.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    try {
      await deleteDoc(doc(db, 'plans', id));
    } catch (e) {
      console.error(e);
      alert("Error deleting plan.");
    }
  };

  const startEdit = (plan: PlanDefinition) => {
    setEditingId(plan.id);
    setFormData(plan);
    setIsAdding(false);
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setFormData({
      ...formData,
      features: [...(formData.features || []), featureInput.trim()]
    });
    setFeatureInput('');
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: (formData.features || []).filter((_, i) => i !== index)
    });
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Plan Management (প্যাকেজ ম্যানেজমেন্ট)</h3>
        {!isAdding && !editingId && (
          <button 
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Plan
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white p-8 rounded-2xl border-2 border-blue-100 shadow-xl shadow-blue-50/50 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-gray-900 uppercase tracking-widest">{editingId ? 'Edit Plan' : 'Add New Plan'}</h4>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Starter, Business"
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Price (BDT)</label>
                <input 
                  type="number" 
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-blue-600"
                />
              </div>

              <div className="flex gap-6">
                <div className="space-y-2 flex-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Badge (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="e.g. Most Popular"
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Display Order</label>
                  <input 
                    type="number" 
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-4"></div>
                </div>
                <span className="text-sm font-bold text-gray-700">Mark as Popular</span>
              </label>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Features List</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFeature()}
                    placeholder="Enter feature..."
                    className="flex-1 h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                  />
                  <button onClick={addFeature} className="px-4 bg-gray-900 text-white rounded-xl">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
                  {formData.features?.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-50 group">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5" /> {f}
                      </span>
                      <button onClick={() => removeFeature(i)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-white rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-50 flex gap-4">
            <button 
              onClick={() => handleSave(editingId || undefined)}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Plan
            </button>
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="px-8 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.id} className={cn(
            "bg-white p-6 rounded-3xl border border-gray-100 relative group transition-all hover:shadow-xl hover:-translate-y-1",
            p.isPopular && "border-blue-500/30 bg-blue-50/10 shadow-lg shadow-blue-50"
          )}>
            {p.isPopular && (
              <span className="absolute -top-3 right-6 px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase rounded-full shadow-lg shadow-blue-200">Popular</span>
            )}
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-xl font-black text-gray-900">{p.name}</h4>
                <div className="text-2xl font-black text-blue-600 mt-1">{p.price} TK<span className="text-xs font-medium text-gray-400">/mo</span></div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => startEdit(p)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {p.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-auto border-t border-gray-50 pt-4">Order: {p.order}</div>
          </div>
        ))}

        {plans.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-gray-500 font-bold">No plans defined yet.</h4>
            <p className="text-xs text-gray-400 mb-6">Create your first subscription plan to get started.</p>
            <button onClick={() => setIsAdding(true)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100">Create Plan</button>
          </div>
        )}
      </div>
    </div>
  );
}
