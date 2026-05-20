import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Clock, 
  Check, 
  Play, 
  AlertTriangle, 
  Edit3, 
  X, 
  Coffee,
  CheckCircle,
  AlertCircle,
  UploadCloud,
  Settings,
  Lock,
  LogIn,
  Phone,
  Link as LinkIcon,
  Trash2
} from 'lucide-react';

const AdminDashboard = () => {
  const { tenantId } = useParams();
  const { socket, connected } = useSocket();
  const [tenant, setTenant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'catalog' | 'settings'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // New Order visual alert state
  const [newOrderReceived, setNewOrderReceived] = useState(false);
  const [latestOrderInfo, setLatestOrderInfo] = useState(null);

  // Form edit popup state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', image: '', category: '', isVeg: true });
  const [editMediaList, setEditMediaList] = useState([]);

  // Delete product state
  const [deletingItem, setDeletingItem] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    logo: '',
    workingTime: '',
    phone: '',
    description: '',
    instagram: '',
    facebook: '',
    whatsapp: '',
    website: '',
    primary: '',
    primaryHover: '',
    background: '',
    accent: '',
    text: ''
  });

  const apiHost = `http://${window.location.hostname}:4000`;

  // WebSockets Real-time connection
  useEffect(() => {
    if (socket && connected && tenantId && isAuthenticated) {
      socket.emit('join-tenant', tenantId);

      socket.on('new-order', (newOrder) => {
        setOrders(prev => [newOrder, ...prev]);
        setLatestOrderInfo(newOrder);
        setNewOrderReceived(true);
        setTimeout(() => setNewOrderReceived(false), 5000);
      });

      socket.on('order-updated', (updatedOrder) => {
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      });

      socket.on('menu-updated', (updatedMenu) => {
        setMenu(updatedMenu);
      });

      return () => {
        socket.off('new-order');
        socket.off('order-updated');
        socket.off('menu-updated');
      };
    }
  }, [socket, connected, tenantId, isAuthenticated]);

  // Fetch initial restaurant state & authentication verification
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        const tenantRes = await fetch(`${apiHost}/api/tenants/${tenantId}`);
        if (!tenantRes.ok) {
          throw new Error('Failed to load portal configuration.');
        }
        const tenantData = await tenantRes.json();
        setTenant(tenantData);

        // Check password auth token in localStorage
        const token = localStorage.getItem(`authToken-${tenantId}`);
        if (token === `token-resto-${tenantId}`) {
          setIsAuthenticated(true);
          
          // Load menu and orders since authorized
          const [menuRes, ordersRes] = await Promise.all([
            fetch(`${apiHost}/api/tenants/${tenantId}/menu`),
            fetch(`${apiHost}/api/tenants/${tenantId}/orders`)
          ]);

          if (menuRes.ok && ordersRes.ok) {
            const menuData = await menuRes.json();
            const ordersData = await ordersRes.json();
            setMenu(menuData);
            setOrders(ordersData);
          }

          // Populate settings form
          setSettingsForm({
            name: tenantData.name,
            logo: tenantData.logo,
            workingTime: tenantData.workingTime || '',
            phone: tenantData.phone || '',
            description: tenantData.description || '',
            instagram: tenantData.socials?.instagram || '',
            facebook: tenantData.socials?.facebook || '',
            whatsapp: tenantData.socials?.whatsapp || '',
            website: tenantData.socials?.website || '',
            primary: tenantData.theme?.primary || '',
            primaryHover: tenantData.theme?.primaryHover || '',
            background: tenantData.theme?.background || '',
            accent: tenantData.theme?.accent || '',
            text: tenantData.theme?.text || ''
          });
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error configuring portal dashboard.');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchAdminData();
    }
  }, [tenantId, isAuthenticated]);

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${apiHost}/api/tenants/${tenantId}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem(`authToken-${tenantId}`, data.token);
      setIsAuthenticated(true);
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(`authToken-${tenantId}`);
    setIsAuthenticated(false);
  };

  // Toggle availability instantly
  const handleToggleAvailability = async (itemId, currentStatus) => {
    try {
      const res = await fetch(`${apiHost}/api/tenants/${tenantId}/menu/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !currentStatus })
      });

      if (!res.ok) throw new Error('Toggle error');
    } catch (err) {
      console.error(err);
      alert('Error updating live availability. Check server logs.');
    }
  };

  // Status transitions
  const handleAdvanceStatus = async (orderId, currentStatus) => {
    let nextStatus = 'Preparing';
    if (currentStatus === 'Preparing') nextStatus = 'Served';

    try {
      const res = await fetch(`${apiHost}/api/tenants/${tenantId}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) throw new Error('Status transition error');
    } catch (err) {
      console.error(err);
      alert('Failed to update status. Please try again.');
    }
  };

  // Catalog item editor modal
  const openEditModal = (item) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      image: item.image,
      category: item.category,
      isVeg: item.isVeg
    });
    setEditMediaList(item.media || [{ type: 'image', url: item.image }]);
  };

  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditMediaList(prev => [...prev, { type, url: event.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMedia = (indexToRemove) => {
    setEditMediaList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const coverImage = editMediaList[0]?.url || editForm.image;
      const isNew = editingItem.id === 'new';
      
      const url = isNew 
        ? `${apiHost}/api/tenants/${tenantId}/menu`
        : `${apiHost}/api/tenants/${tenantId}/menu/${editingItem.id}/details`;
      
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          price: editForm.price,
          image: coverImage,
          category: editForm.category,
          media: editMediaList,
          isVeg: editForm.isVeg
        })
      });

      if (!res.ok) throw new Error('Details update failed');

      // Update local state menu from returned payload
      const updatedMenu = await res.json();
      setMenu(updatedMenu);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save item details.');
    }
  };

  // Delete product confirmation handler
  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    setDeleteError('');
    try {
      const res = await fetch(`${apiHost}/api/tenants/${tenantId}/menu/${deletingItem.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete item.');

      setMenu(data.menu);
      setDeletingItem(null);
      setDeletePassword('');
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  // Settings Save Handler
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiHost}/api/tenants/${tenantId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settingsForm.name,
          logo: settingsForm.logo,
          workingTime: settingsForm.workingTime,
          phone: settingsForm.phone,
          description: settingsForm.description,
          socials: {
            instagram: settingsForm.instagram,
            facebook: settingsForm.facebook,
            whatsapp: settingsForm.whatsapp,
            website: settingsForm.website
          },
          theme: {
            primary: settingsForm.primary,
            primaryHover: settingsForm.primaryHover,
            background: settingsForm.background,
            accent: settingsForm.accent,
            text: settingsForm.text
          }
        })
      });

      if (!res.ok) throw new Error('Settings update failed');
      alert('Restaurant details and settings saved successfully!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Error saving restaurant settings.');
    }
  };

  const handleSettingsLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSettingsForm(prev => ({ ...prev, logo: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        <p className="ml-3 text-slate-500 font-bold">Booting Kitchen Console...</p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertTriangle className="w-14 h-14 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800">Connection Failed</h2>
        <p className="mt-1 text-slate-500 max-w-sm">{error || 'Restaurant database reference does not exist.'}</p>
      </div>
    );
  }

  // Render Login overlay screen if not authenticated for this tenant
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200/80 rounded-3xl max-w-sm w-full p-8 shadow-2xl relative z-10"
        >
          <div className="text-center space-y-4 mb-8">
            <div className="w-16 h-16 rounded-2xl border border-slate-200 overflow-hidden shadow-inner mx-auto flex items-center justify-center">
              <img src={tenant.logo} alt={tenant.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-extrabold text-2xl text-slate-800 tracking-tight leading-none">{tenant.name}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Kitchen Login Portal</p>
            </div>
          </div>

          {loginError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold p-3.5 rounded-xl flex items-start space-x-2.5 mb-6">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Enter Admin Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••••••"
                  value={passwordInput} 
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-450 placeholder:text-slate-350"
                />
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl cursor-pointer mt-2 shadow-lg active:scale-98 transition-transform flex items-center justify-center space-x-2"
              style={{ backgroundColor: tenant.theme.primary }}
            >
              <LogIn className="w-4 h-4" />
              <span>Unlock Console</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Filter orders
  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  const servedOrders = orders.filter(o => o.status === 'Served');

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col lg:flex-row antialiased">
      {/* Sidebar Panel */}
      <aside className="w-full lg:w-72 bg-slate-900 text-slate-200 p-6 flex flex-col justify-between border-b lg:border-r border-slate-800">
        <div className="space-y-10">
          {/* Logo & Header */}
          <div className="flex items-center space-x-3.5 pb-6 border-b border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner overflow-hidden">
              <img src={tenant.logo} alt={tenant.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-extrabold text-[16px] text-white tracking-tight leading-snug">{tenant.name}</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">SaaS Kitchen HUB</p>
            </div>
          </div>

          {/* Sockets Connection State */}
          <div className="flex items-center space-x-2 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800/80">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'}`}></div>
            <span className="text-[11px] font-extrabold tracking-wide text-slate-400">
              {connected ? 'REAL-TIME ONLINE' : 'DISCONNECTED'}
            </span>
          </div>

          {/* Navigation Controls */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'orders' 
                  ? 'bg-white text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Live Kitchen Screen</span>
              {(pendingOrders.length + preparingOrders.length) > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {pendingOrders.length + preparingOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'catalog' 
                  ? 'bg-white text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Product Catalog</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-white text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Brand Portal settings</span>
            </button>
          </nav>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-800">
          <button 
            onClick={handleLogout} 
            className="w-full py-2 border border-slate-800 hover:bg-slate-800 text-[10px] font-bold text-slate-450 uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Lock Dashboard
          </button>
          <div className="text-[10px] font-bold text-slate-500 flex items-center justify-between">
            <span>WHITE-LABEL PLATFORM</span>
            <span>v2.2.0</span>
          </div>
        </div>
      </aside>

      {/* Main Board */}
      <main className="flex-1 p-6 lg:p-10 max-h-screen overflow-y-auto">
        {/* Real-time Order Popup Notification Banner */}
        <AnimatePresence>
          {newOrderReceived && latestOrderInfo && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              className="fixed top-6 right-6 z-50 bg-rose-500 text-white p-5 rounded-2xl shadow-2xl max-w-sm border border-rose-400/30"
            >
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                  🔔
                </div>
                <div>
                  <h4 className="font-extrabold text-sm tracking-tight">New Incoming Table Order!</h4>
                  <p className="text-xs text-rose-100 mt-0.5">Table {latestOrderInfo.tableId} just placed an order of ₹{latestOrderInfo.total.toFixed(2)}.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'orders' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Real-Time Kitchen Feed</h1>
                <p className="text-xs text-slate-500 font-medium mt-1">Monitor live incoming table orders and advance their prep cycles.</p>
              </div>

              {/* Stats badges */}
              <div className="flex items-center space-x-3">
                <div className="bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200/50 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-[11px] font-bold text-amber-800">{pendingOrders.length} New Queue</span>
                </div>
                <div className="bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200/50 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-[11px] font-bold text-blue-800">{preparingOrders.length} In Prep</span>
                </div>
              </div>
            </div>

            {/* Split Order Columns */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Active incoming / preparing queue */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center space-x-2">
                  <span>Pending & Preparing</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-700">
                    {pendingOrders.length + preparingOrders.length}
                  </span>
                </h3>

                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {[...pendingOrders, ...preparingOrders].map((order) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        key={order.id}
                        className={`bg-white rounded-2xl p-5 border shadow-xs transition-colors ${
                          order.status === 'Pending' ? 'border-amber-400' : 'border-blue-400'
                        }`}
                      >
                        {/* Header Details */}
                        <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-lg text-slate-800">Table {order.tableId}</span>
                              <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                order.status === 'Pending' 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {order.status === 'Pending' ? 'New Order' : 'Cooking'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold flex items-center mt-1">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              <span>Ordered at {new Date(order.createdAt).toLocaleTimeString()}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] font-bold text-slate-400 block uppercase">Basket total</span>
                            <span className="font-black text-slate-800 text-lg">₹{order.total.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <ul className="py-4 space-y-2">
                          {order.items.map((cartItem, i) => (
                            <li key={i} className="flex justify-between items-center text-sm font-semibold text-slate-700">
                              <div className="flex items-center space-x-2">
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md text-xs font-black text-slate-600">
                                  {cartItem.quantity}x
                                </span>
                                <span>{cartItem.item.name}</span>
                              </div>
                              <span className="text-slate-400 font-black text-xs">₹{(cartItem.item.price * cartItem.quantity).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Cook Notes */}
                        {order.notes && (
                          <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold p-3.5 rounded-xl flex items-start space-x-2.5 mb-4">
                            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] uppercase font-black tracking-wider block text-rose-600">Special Cook Instructions:</span>
                              <p className="mt-0.5 text-rose-900 leading-snug">{order.notes}</p>
                            </div>
                          </div>
                        )}

                        {/* Transition Actions */}
                        <div>
                          {order.status === 'Pending' ? (
                            <button
                              onClick={() => handleAdvanceStatus(order.id, 'Pending')}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-transform active:scale-98"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Start Preparing</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAdvanceStatus(order.id, 'Preparing')}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-transform active:scale-98"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Mark as Served</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {pendingOrders.length + preparingOrders.length === 0 && (
                    <div className="bg-white border border-slate-200/60 rounded-2xl py-12 text-center shadow-2xs">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Check className="w-6 h-6 text-slate-400" />
                      </div>
                      <h4 className="font-extrabold text-slate-700 text-[15px]">No Pending Orders</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Incoming orders will pop up here in real-time.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order History column (Served) */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center space-x-2">
                  <span>Completed Feed</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-700">
                    {servedOrders.length}
                  </span>
                </h3>

                <div className="space-y-3">
                  {servedOrders.map(order => (
                    <div key={order.id} className="bg-slate-100/60 rounded-xl p-4 border border-slate-200/50 flex justify-between items-center shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-slate-800">Table {order.tableId}</span>
                          <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-sm">Served</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">{order.items.length} items ordered · ₹{order.total.toFixed(2)}</p>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                  ))}

                  {servedOrders.length === 0 && (
                    <div className="border border-dashed border-slate-300 rounded-2xl py-10 text-center">
                      <span className="text-slate-400 font-bold text-xs">No orders completed today</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="space-y-8 animate-none">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Product Catalog</h1>
                <p className="text-xs text-slate-500 font-medium mt-1">Manage food details, add new options, or delete catalog items dynamically.</p>
              </div>
              <button
                onClick={() => {
                  setEditingItem({ id: 'new' });
                  setEditForm({ name: '', description: '', price: '', image: '', category: 'Starters', isVeg: true });
                  setEditMediaList([]);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <span>+ Add Dish</span>
              </button>
            </div>

            {/* Catalog list wrapper (Desktop table & Mobile cards) */}
            <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xs overflow-hidden">
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="px-6 py-4">Dish</th>
                      <th className="px-6 py-4">Section</th>
                      <th className="px-6 py-4">Diet Type</th>
                      <th className="px-6 py-4">Standard Price</th>
                      <th className="px-6 py-4 text-center">Availability</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {menu.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 flex items-center space-x-3.5">
                          <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-200/50" />
                          <div>
                            <span className="font-extrabold text-slate-800 block text-sm">{item.name}</span>
                            <span className="text-xs text-slate-400 line-clamp-1 max-w-[200px] mt-0.5">{item.description}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-500">{item.category}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            item.isVeg 
                              ? 'bg-green-50 text-green-700 border border-green-150' 
                              : 'bg-rose-50 text-rose-700 border border-rose-150'
                          }`}>
                            {item.isVeg ? 'Veg' : 'Non-Veg'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-800">₹{item.price.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleToggleAvailability(item.id, item.available)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none ${
                                item.available ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                                item.available ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openEditModal(item)}
                            className="bg-slate-100 text-slate-650 hover:bg-slate-200 hover:text-slate-800 p-2 rounded-xl inline-flex items-center space-x-1 font-bold text-xs cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Modify</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeletingItem(item);
                              setDeletePassword('');
                              setDeleteError('');
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl inline-flex items-center justify-center cursor-pointer ml-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Stack View */}
              <div className="block md:hidden divide-y divide-slate-150">
                {menu.map((item) => (
                  <div key={item.id} className="p-4 space-y-3 hover:bg-slate-55/30">
                    <div className="flex items-start space-x-3.5">
                      <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover border border-slate-200 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-800 text-sm truncate">{item.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            item.isVeg ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {item.isVeg ? 'Veg' : 'N-Veg'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100/60">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Category · Price</span>
                        <span className="text-xs font-black text-slate-700">{item.category} · ₹{item.price.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        {/* Toggle */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold text-slate-400">Live</span>
                          <button
                            onClick={() => handleToggleAvailability(item.id, item.available)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer outline-none ${
                              item.available ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-xs ${
                              item.available ? 'translate-x-4.5' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={() => openEditModal(item)}
                          className="bg-slate-100 text-slate-650 px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase cursor-pointer"
                        >
                          Edit
                        </button>
                        
                        <button
                          onClick={() => {
                            setDeletingItem(item);
                            setDeletePassword('');
                            setDeleteError('');
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-650 p-1.5 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-none">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Portal Brand Settings</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">Update restaurant metadata, description, contact details, social links, and layout color templates.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200/60 rounded-3xl p-6 lg:p-8 shadow-xs space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Restaurant Name</label>
                  <input 
                    type="text" 
                    required 
                    value={settingsForm.name} 
                    onChange={e => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Working Time / Schedule</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. 10:00 AM - 11:00 PM"
                    value={settingsForm.workingTime} 
                    onChange={e => setSettingsForm(prev => ({ ...prev, workingTime: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Mobile Contact / Hotline</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      placeholder="+91 98765 43210"
                      value={settingsForm.phone} 
                      onChange={e => setSettingsForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
                    />
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Brand Logo Image</label>
                  <div className="flex items-center space-x-3">
                    <label className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-2.5 flex items-center justify-center cursor-pointer text-slate-500 text-xs font-bold transition-colors">
                      <UploadCloud className="w-4 h-4 mr-1.5 text-slate-400" />
                      <span>Upload Logo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleSettingsLogoUpload} 
                        className="hidden" 
                      />
                    </label>
                    <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                      {settingsForm.logo ? (
                        <img src={settingsForm.logo} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] text-slate-400 font-bold uppercase">No Logo</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Restaurant Description</label>
                <textarea 
                  required 
                  rows="3"
                  value={settingsForm.description} 
                  onChange={e => setSettingsForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Social Channels section */}
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Social Accounts Links</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Instagram Link</label>
                    <div className="relative">
                      <input 
                        type="url" 
                        value={settingsForm.instagram} 
                        onChange={e => setSettingsForm(prev => ({ ...prev, instagram: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
                      />
                      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                      </svg>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Facebook Link</label>
                    <div className="relative">
                      <input 
                        type="url" 
                        value={settingsForm.facebook} 
                        onChange={e => setSettingsForm(prev => ({ ...prev, facebook: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
                      />
                      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                      </svg>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">WhatsApp Number Link</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="e.g. +919876543210"
                        value={settingsForm.whatsapp} 
                        onChange={e => setSettingsForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
                      />
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Google / Website URL</label>
                    <div className="relative">
                      <input 
                        type="url" 
                        value={settingsForm.website} 
                        onChange={e => setSettingsForm(prev => ({ ...prev, website: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
                      />
                      <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Theme Color customizer */}
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Theme Colors Customizer</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Primary Color</label>
                    <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                      <input 
                        type="color" 
                        value={settingsForm.primary} 
                        onChange={e => setSettingsForm(prev => ({ ...prev, primary: e.target.value }))}
                        className="w-7 h-7 border-0 bg-transparent rounded-xs cursor-pointer"
                      />
                      <span className="text-[10px] font-black text-slate-650 uppercase">{settingsForm.primary}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Primary Hover Color</label>
                    <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                      <input 
                        type="color" 
                        value={settingsForm.primaryHover} 
                        onChange={e => setSettingsForm(prev => ({ ...prev, primaryHover: e.target.value }))}
                        className="w-7 h-7 border-0 bg-transparent rounded-xs cursor-pointer"
                      />
                      <span className="text-[10px] font-black text-slate-650 uppercase">{settingsForm.primaryHover}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Background Canvas</label>
                    <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                      <input 
                        type="color" 
                        value={settingsForm.background} 
                        onChange={e => setSettingsForm(prev => ({ ...prev, background: e.target.value }))}
                        className="w-7 h-7 border-0 bg-transparent rounded-xs cursor-pointer"
                      />
                      <span className="text-[10px] font-black text-slate-650 uppercase">{settingsForm.background}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Accent Theme Color</label>
                    <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                      <input 
                        type="color" 
                        value={settingsForm.accent} 
                        onChange={e => setSettingsForm(prev => ({ ...prev, accent: e.target.value }))}
                        className="w-7 h-7 border-0 bg-transparent rounded-xs cursor-pointer"
                      />
                      <span className="text-[10px] font-black text-slate-650 uppercase">{settingsForm.accent}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Theme Text color</label>
                    <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                      <input 
                        type="color" 
                        value={settingsForm.text} 
                        onChange={e => setSettingsForm(prev => ({ ...prev, text: e.target.value }))}
                        className="w-7 h-7 border-0 bg-transparent rounded-xs cursor-pointer"
                      />
                      <span className="text-[10px] font-black text-slate-650 uppercase">{settingsForm.text}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl cursor-pointer shadow-md active:scale-98 transition-transform"
                style={{ backgroundColor: tenant.theme.primary }}
              >
                Save Brand Portal Settings
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Modify / Create Modal Popup */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 relative z-10 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800">
                    {editingItem.id === 'new' ? 'Add New Dish' : 'Edit Catalog Item'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Customize visual menu data instantly</p>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Item Title</label>
                  <input 
                    type="text" 
                    required 
                    value={editForm.name} 
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Description</label>
                  <textarea 
                    required 
                    rows="2"
                    value={editForm.description} 
                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Category</label>
                    <input 
                      type="text" 
                      required 
                      value={editForm.category} 
                      onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Price (₹)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={editForm.price} 
                      onChange={e => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                {/* Diet selection toggle Veg vs Non-Veg */}
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Diet Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, isVeg: true }))}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        editForm.isVeg 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800' 
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Vegetarian</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, isVeg: false }))}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        !editForm.isVeg 
                          ? 'bg-rose-50 border-rose-500 text-rose-800' 
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>Non-Veg</span>
                    </button>
                  </div>
                </div>

                {/* Direct Cover Image Upload field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-0.5">Product Cover Image</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-2.5 flex items-center justify-center cursor-pointer text-slate-500 text-xs font-bold transition-colors">
                        <UploadCloud className="w-4 h-4 mr-1.5 text-slate-400" />
                        <span>Upload Cover</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                setEditForm(prev => ({ ...prev, image: evt.target.result }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden" 
                        />
                      </label>
                    </div>
                    
                    <div className="aspect-video bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center">
                      {editForm.image ? (
                        <img src={editForm.image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase">No Image</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Multi-Media Gallery Uploader field */}
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Product Media Slider Gallery
                  </label>
                  
                  <div className="grid grid-cols-4 gap-2 mb-1 border border-slate-100 p-2 rounded-2xl bg-slate-50">
                    {editMediaList.map((media, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl bg-white border border-slate-250 overflow-hidden flex items-center justify-center shadow-2xs">
                        {media.type === 'video' ? (
                          <div className="w-full h-full relative">
                            <video src={media.url} className="w-full h-full object-cover" muted />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[8px] font-black uppercase tracking-wide">VIDEO</div>
                          </div>
                        ) : (
                          <img src={media.url} alt="media preview" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(idx)}
                          className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-transform"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Add new media trigger box */}
                    <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 bg-white hover:bg-slate-50">
                      <UploadCloud className="w-5 h-5 text-slate-400" />
                      <span className="text-[8px] font-black uppercase tracking-wider mt-1 text-slate-400">Add File</span>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*,video/*" 
                        onChange={handleMediaUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1 leading-none">Supports images & videos (saved persistently in SQLite)</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm py-3 rounded-xl cursor-pointer mt-4"
                >
                  {editingItem.id === 'new' ? 'Create Product' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Product Confirmation Modal */}
      <AnimatePresence>
        {deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingItem(null)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 relative z-10 shadow-2xl border border-slate-100 my-8 text-center"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-5">
                <h3 className="font-extrabold text-lg text-slate-800">Confirm Deletion</h3>
                <button
                  onClick={() => setDeletingItem(null)}
                  className="w-7 h-7 rounded-full bg-slate-150 flex items-center justify-center cursor-pointer text-slate-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {deleteError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold p-3 rounded-xl flex items-start space-x-2 mb-4 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-sm text-slate-550 mb-5 font-semibold">
                Are you sure you want to permanently delete <strong className="text-slate-800">"{deletingItem.name}"</strong>?
              </p>

              <form onSubmit={handleDeleteSubmit} className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Enter Restaurant Password
                  </label>
                  <div className="relative">
                    <input 
                      type="password" 
                      required 
                      placeholder="••••••••••••"
                      value={deletePassword} 
                      onChange={e => setDeletePassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-450"
                    />
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingItem(null)}
                    className="py-3 rounded-xl text-xs font-black uppercase text-slate-500 border border-slate-250 cursor-pointer bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-3 rounded-xl text-xs font-black uppercase text-white bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-md"
                  >
                    Yes, Delete
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
