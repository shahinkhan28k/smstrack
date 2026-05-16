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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Subscription Plans (সদস্যতা প্যাকেজ)</h3>
          <p className="text-xs text-gray-500 font-medium">Manage how much users pay for your SMS gateway services.</p>
        </div>
        {!isAdding && !editingId && (
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-blue-100 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> Add New Plan (নতুন প্যাকেজ)
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-2xl shadow-blue-50 animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-10">
            <div>
               <h4 className="font-black text-gray-900 uppercase tracking-widest text-lg">{editingId ? 'Edit Plan Package' : 'Create New Package'}</h4>
               <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Pricing Configuration</p>
            </div>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plan Name (প্যাকেজের নাম)</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Basic, Premium, Gold"
                  className="w-full h-14 px-6 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-gray-900 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (মূল্য)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="w-full h-14 pl-12 pr-6 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-black text-blue-600 shadow-sm"
                    />
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Order (ক্রম)</label>
                  <input 
                    type="number" 
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full h-14 px-6 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-gray-900 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Display Badge (ব্যাজ)</label>
                <input 
                  type="text" 
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="e.g. Most Popular, 50% OFF"
                  className="w-full h-14 px-6 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-emerald-600 placeholder:font-medium shadow-sm"
                />
              </div>

              <label className="flex items-center gap-4 cursor-pointer group p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 transition-all">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-7 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                  <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-all peer-checked:translate-x-5 shadow-sm"></div>
                </div>
                <div>
                  <span className="text-sm font-black text-gray-700 block">Set as Recommended</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Highlights this plan to users</span>
                </div>
              </label>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plan Features (বৈশিষ্ট্য)</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFeature()}
                    placeholder="Enter feature (e.g. Unlimited SMS)..."
                    className="flex-1 h-14 px-6 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-medium shadow-sm"
                  />
                  <button 
                    onClick={addFeature} 
                    className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all shadow-lg active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="mt-4 space-y-2 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                  {formData.features?.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 group hover:border-blue-200 hover:shadow-sm transition-all">
                      <span className="text-sm font-bold text-gray-700 flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" /> {f}
                      </span>
                      <button onClick={() => removeFeature(i)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-50 rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!formData.features || formData.features.length === 0) && (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-xs font-bold uppercase tracking-widest">No features added</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => handleSave(editingId || undefined)}
              className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:shadow-2xl hover:shadow-blue-200 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Confirm & Post Plan
            </button>
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="px-10 h-14 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
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
