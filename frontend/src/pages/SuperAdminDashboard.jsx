import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  ShoppingBag, 
  UtensilsCrossed, 
  Plus, 
  X, 
  ExternalLink, 
  ShieldAlert, 
  Palette,
  Activity,
  Trash2,
  Lock,
  LogIn
} from 'lucide-react';
import { API_HOST } from '../config';

const SuperAdminDashboard = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Super Admin Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginCreds, setLoginCreds] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Onboarding Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop&q=80',
    password: '',
    primary: '#d97706',
    primaryHover: '#b45309',
    background: '#fdfbf7',
    accent: '#fef3c7',
    text: '#78350f'
  });

  const apiHost = API_HOST;

  // Fetch all tenants
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiHost}/api/super/tenants`);
      if (!res.ok) throw new Error('Failed to retrieve tenant statistics');
      const data = await res.json();
      setTenants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('superAdminToken');
    if (token === 'super-admin-jwt-token-sim') {
      setIsAuthenticated(true);
      fetchTenants();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleSuperLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${apiHost}/api/super/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginCreds)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('superAdminToken', data.token);
      setIsAuthenticated(true);
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleSuperLogout = () => {
    localStorage.removeItem('superAdminToken');
    setIsAuthenticated(false);
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Input sanitization
    const cleanId = formData.id.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleanId) {
      setFormError('Slug must contain only alphanumeric characters or dashes.');
      return;
    }

    try {
      const payload = {
        id: cleanId,
        name: formData.name,
        logo: formData.logo,
        password: formData.password,
        theme: {
          primary: formData.primary,
          primaryHover: formData.primaryHover,
          background: formData.background,
          accent: formData.accent,
          text: formData.text
        }
      };

      const res = await fetch(`${apiHost}/api/super/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to register brand');
      }

      // Reset & refresh
      setShowAddForm(false);
      setFormData({
        id: '',
        name: '',
        logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop&q=80',
        password: '',
        primary: '#d97706',
        primaryHover: '#b45309',
        background: '#fdfbf7',
        accent: '#fef3c7',
        text: '#78350f'
      });
      fetchTenants();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDeleteTenant = async (tenantId, tenantName) => {
    const confirmed = window.confirm(`CRITICAL WARNING:\nAre you sure you want to delete "${tenantName}" (${tenantId})?\nThis will permanently delete all associated menu items, order history, and restaurant configurations!`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${apiHost}/api/super/tenants/${tenantId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Deletion failed');
      alert(`${tenantName} has been successfully deleted.`);
      fetchTenants();
    } catch (err) {
      console.error(err);
      alert('Error deleting tenant restaurant.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-white rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Platform Supervisor Booting...</p>
      </div>
    );
  }

  // Render Login overlay screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient background glowing circles */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1e293b] border border-slate-800 rounded-3xl max-w-sm w-full p-8 shadow-2xl text-slate-200 relative z-10"
        >
          <div className="text-center space-y-3 mb-8">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 text-indigo-400 mx-auto shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-extrabold text-2xl text-white tracking-tight leading-none">Super Admin LogIn</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Access Platform Supervisor</p>
          </div>

          {loginError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold p-3.5 rounded-xl flex items-start space-x-2.5 mb-6">
              <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSuperLoginSubmit} className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Username</label>
              <input 
                type="text" 
                required 
                placeholder="superadmin"
                value={loginCreds.username} 
                onChange={e => setLoginCreds(prev => ({ ...prev, username: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-slate-600 placeholder:text-slate-650"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Password</label>
              <input 
                type="password" 
                required 
                placeholder="••••••••••••"
                value={loginCreds.password} 
                onChange={e => setLoginCreds(prev => ({ ...prev, password: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-slate-600 placeholder:text-slate-650"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl cursor-pointer mt-2 shadow-lg active:scale-98 transition-transform flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Enter Console</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Aggregate Stats
  const platformTotalTenants = tenants.length;
  const platformTotalOrders = tenants.reduce((acc, t) => acc + t.totalOrders, 0);
  const platformTotalItems = tenants.reduce((acc, t) => acc + t.totalItems, 0);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans pb-16">
      
      {/* Header Banner */}
      <header className="border-b border-slate-800 bg-[#0b0f19] sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/35 shadow-inner">
              <Activity className="w-5.5 h-5.5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-white leading-tight tracking-tight">Antigravity Console</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">SaaS Platform Operator</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSuperLogout}
              className="border border-slate-800 hover:bg-slate-800 text-slate-400 font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl cursor-pointer transition-colors"
            >
              LogOut
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer shadow-lg active:scale-98 transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Restaurant</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 pt-10 space-y-10">
        
        {/* Aggregate statistics row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1e293b]/60 border border-slate-800/80 p-6 rounded-2xl flex items-center space-x-4 shadow-xs">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider block">Restaurants Onboarded</span>
              <span className="font-black text-2xl text-white mt-1 block">{platformTotalTenants} Active</span>
            </div>
          </div>

          <div className="bg-[#1e293b]/60 border border-slate-800/80 p-6 rounded-2xl flex items-center space-x-4 shadow-xs">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider block">Total Platform Orders</span>
              <span className="font-black text-2xl text-white mt-1 block">{platformTotalOrders} Tickets</span>
            </div>
          </div>

          <div className="bg-[#1e293b]/60 border border-slate-800/80 p-6 rounded-2xl flex items-center space-x-4 shadow-xs">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 text-amber-400">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider block">Stock Menu Dishes</span>
              <span className="font-black text-2xl text-white mt-1 block">{platformTotalItems} Dishes</span>
            </div>
          </div>
        </section>
 
        {/* Tenant listings */}
        <section className="space-y-6">
          <h2 className="text-xl font-extrabold text-white tracking-tight">Active Tenant Instances</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map(t => (
              <div 
                key={t.id} 
                className="bg-[#1e293b]/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-6 shadow-xs hover:border-slate-700 transition-colors relative group"
              >
                {/* Delete button (displays on top right corner) */}
                <button
                  onClick={() => handleDeleteTenant(t.id, t.name)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer p-1 rounded-lg bg-slate-900/40 hover:bg-rose-500/10 border border-slate-850"
                  title="Delete Restaurant Instance"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Brand Title */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5 pr-8">
                    <img src={t.logo} alt={t.name} className="w-11 h-11 rounded-xl object-cover border border-slate-700 shadow-inner" />
                    <div>
                      <h3 className="font-extrabold text-white text-[15px] leading-snug tracking-tight">{t.name}</h3>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.id}</span>
                    </div>
                  </div>

                  {/* Visual swatches */}
                  <div className="flex space-x-1 bg-slate-900/50 p-1.5 rounded-lg border border-slate-800">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.theme.primary }} title="Primary" />
                    <div className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.theme.background }} title="Background" />
                  </div>
                </div>

                {/* Tenant Stats */}
                <div className="grid grid-cols-2 gap-4 bg-slate-900/35 border border-slate-850 p-3 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Menu Items</span>
                    <span className="font-black text-sm text-slate-200 mt-0.5 block">{t.totalItems} dishes</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Orders</span>
                    <span className="font-black text-sm text-slate-200 mt-0.5 block">{t.totalOrders} tickets</span>
                  </div>
                </div>

                {/* Direct routes navigation links */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <a 
                    href={`/menu/${t.id}/table-1`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-1.5 bg-[#0f172a]/70 hover:bg-[#0f172a] text-slate-300 py-2.5 rounded-xl border border-slate-800 text-[11px] font-black uppercase tracking-wider transition-colors shadow-2xs"
                  >
                    <span>Menu Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <a 
                    href={`/admin/${t.id}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-1.5 bg-[#0f172a]/70 hover:bg-[#0f172a] text-slate-300 py-2.5 rounded-xl border border-slate-800 text-[11px] font-black uppercase tracking-wider transition-colors shadow-2xs"
                  >
                    <span>Kitchen Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Onboarding Overlay Popup Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="absolute inset-0 bg-slate-950"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1e293b] border border-slate-800 rounded-3xl max-w-md w-full p-6 relative z-10 shadow-2xl text-slate-200"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-850 mb-6">
                <div>
                  <h3 className="font-extrabold text-lg text-white">Onboard New Restaurant</h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Register branding to active SaaS stack</p>
                </div>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold p-3.5 rounded-xl flex items-start space-x-2.5 mb-6">
                  <ShieldAlert className="w-4.5 h-4.5 text-rose-400 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleOnboardSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Tenant Slug</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. taco-palace"
                      value={formData.id} 
                      onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-slate-600 placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Brand Name</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Taco Palace"
                      value={formData.name} 
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-slate-600 placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Brand Logo URL</label>
                    <input 
                      type="url" 
                      required 
                      value={formData.logo} 
                      onChange={e => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Admin Password</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. secret123"
                      value={formData.password} 
                      onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-slate-600 placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Color presets swatches */}
                <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Dynamic Brand Theme Colors</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Primary Brand Color</label>
                      <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        <input 
                          type="color" 
                          value={formData.primary} 
                          onChange={e => setFormData(prev => ({ ...prev, primary: e.target.value }))}
                          className="w-6 h-6 border-0 bg-transparent rounded-xs cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{formData.primary}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Hover Color Accent</label>
                      <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        <input 
                          type="color" 
                          value={formData.primaryHover} 
                          onChange={e => setFormData(prev => ({ ...prev, primaryHover: e.target.value }))}
                          className="w-6 h-6 border-0 bg-transparent rounded-xs cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{formData.primaryHover}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Soft Background Canvas</label>
                      <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        <input 
                          type="color" 
                          value={formData.background} 
                          onChange={e => setFormData(prev => ({ ...prev, background: e.target.value }))}
                          className="w-6 h-6 border-0 bg-transparent rounded-xs cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{formData.background}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Theme Accent Badge</label>
                      <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        <input 
                          type="color" 
                          value={formData.accent} 
                          onChange={e => setFormData(prev => ({ ...prev, accent: e.target.value }))}
                          className="w-6 h-6 border-0 bg-transparent rounded-xs cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{formData.accent}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl cursor-pointer mt-4 shadow-lg active:scale-98 transition-transform"
                >
                  Onboard & Seed Database
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminDashboard;
