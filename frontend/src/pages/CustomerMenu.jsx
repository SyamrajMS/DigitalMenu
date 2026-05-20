import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  ChevronRight, 
  Plus, 
  Minus, 
  AlertTriangle,
  MessageSquare,
  Globe,
  Phone,
  Clock
} from 'lucide-react';
import { API_HOST } from '../config';

const CustomerMenu = () => {
  const { tenantId, tableId } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();

  const [tenant, setTenant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [isOrderPlacing, setIsOrderPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const categoriesRef = useRef(null);
  const apiHost = API_HOST;

  // Sync state with localstorage on load
  useEffect(() => {
    const savedCart = localStorage.getItem(`qr-cart-${tenantId}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, [tenantId]);

  // Join Room for Multi-tenant sockets
  useEffect(() => {
    if (socket && connected && tenantId) {
      socket.emit('join-tenant', tenantId);

      socket.on('menu-updated', (updatedMenu) => {
        setMenu(updatedMenu);
      });

      return () => {
        socket.off('menu-updated');
      };
    }
  }, [socket, connected, tenantId]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [tenantRes, menuRes] = await Promise.all([
          fetch(`${apiHost}/api/tenants/${tenantId}`),
          fetch(`${apiHost}/api/tenants/${tenantId}/menu`)
        ]);

        if (!tenantRes.ok || !menuRes.ok) {
          throw new Error('Failed to load restaurant details.');
        }

        const tenantData = await tenantRes.json();
        const menuData = await menuRes.json();

        setTenant(tenantData);
        setMenu(menuData);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Restaurant not found');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchInitialData();
    }
  }, [tenantId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f6]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading Gourmet Experience...</p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f6] p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Oops!</h2>
        <p className="mt-2 text-slate-600 max-w-sm">{error || 'This restaurant link is invalid or offline.'}</p>
      </div>
    );
  }

  const categories = ['All', ...Array.from(new Set(menu.map((item) => item.category)))];
  const filteredMenu = activeCategory === 'All' 
    ? menu 
    : menu.filter((item) => item.category === activeCategory);

  // Sync to localstorage
  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem(`qr-cart-${tenantId}`, JSON.stringify(newCart));
  };

  const addToCart = (item) => {
    const existing = cart.find((c) => c.item.id === item.id);
    if (existing) {
      saveCart(cart.map((c) => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      saveCart([...cart, { item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId) => {
    const existing = cart.find((c) => c.item.id === itemId);
    if (!existing) return;
    if (existing.quantity === 1) {
      saveCart(cart.filter((c) => c.item.id !== itemId));
    } else {
      saveCart(cart.map((c) => c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c));
    }
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      setIsOrderPlacing(true);
      const res = await fetch(`${apiHost}/api/tenants/${tenantId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: tableId || 'Table',
          items: cart,
          total: cartTotal,
          notes: orderNotes
        })
      });

      if (!res.ok) throw new Error('Order submission failed');

      saveCart([]);
      setOrderNotes('');
      setIsCartOpen(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert('Failed to send order to kitchen. Please retry!');
    } finally {
      setIsOrderPlacing(false);
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: tenant.theme.background, minHeight: '100vh' }}
    >
      {/* Mobile container constraint */}
      <div className="w-full max-w-md mx-auto bg-white min-h-screen flex flex-col shadow-lg border-x border-slate-100/50">
        
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 glass-header border-b border-slate-100/50 shadow-xs">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={tenant.logo} 
                alt={tenant.name} 
                className="w-10 h-10 rounded-full object-cover border-2 shadow-xs"
                style={{ borderColor: tenant.theme.primary }}
              />
              <div>
                <h1 className="font-extrabold text-lg text-slate-800 leading-tight tracking-tight">{tenant.name}</h1>
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active Session</span>
                </p>
              </div>
            </div>
            
            <div 
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs border bg-white"
              style={{ color: tenant.theme.primary, borderColor: tenant.theme.primary + '20' }}
            >
              <span>Table</span>
              <span className="bg-slate-50 px-2 py-0.5 rounded-full font-black text-slate-800">
                {tableId || 'T1'}
              </span>
            </div>
          </div>

          {/* Restaurant Details Description */}
          {tenant.description && (
            <div className="px-4 pb-3 border-b border-slate-100/50 space-y-1.5">
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                {tenant.description}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold text-slate-400">
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-slate-400" />
                  {tenant.workingTime || '10:00 AM - 11:00 PM'}
                </span>
                <span className="flex items-center">
                  <Phone className="w-3 h-3 mr-1 text-slate-400" />
                  {tenant.phone || '+91 98765 43210'}
                </span>
              </div>
            </div>
          )}

          {/* Categories Bar */}
          <div className="py-2">
            <div 
              ref={categoriesRef}
              className="flex overflow-x-auto px-4 space-x-2 no-scrollbar scroll-smooth"
            >
              {categories.map((cat) => {
                const isSelected = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`tap-bounce whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all shadow-2xs cursor-pointer ${
                      isSelected 
                        ? 'text-white' 
                        : 'bg-slate-50 text-slate-500 border border-slate-200/60 hover:bg-slate-100'
                    }`}
                    style={{
                      backgroundColor: isSelected ? tenant.theme.primary : undefined,
                      borderColor: isSelected ? tenant.theme.primary : undefined
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Success Banner */}
        <AnimatePresence>
          {orderSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 pt-4"
            >
              <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-xl flex items-center space-x-3">
                <span className="font-extrabold">✓</span>
                <p className="text-xs font-bold">Order received! Kitchen is preparing your meals.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu Listings */}
        <main className="px-4 pt-6 space-y-5 flex-grow">
          <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
            <span>{activeCategory} Specials</span>
            <span className="text-xs text-slate-400 font-bold">{filteredMenu.length} items</span>
          </h2>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredMenu.map((item) => {
                const cartItem = cart.find(c => c.item.id === item.id);
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={item.id}
                    onClick={() => navigate(`/menu/${tenantId}/${tableId}/item/${item.id}`)}
                    className="bg-white rounded-2xl p-3 flex shadow-xs hover:shadow-md transition-shadow relative border border-slate-100/60 cursor-pointer"
                  >
                    {/* Food Image */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 relative shadow-inner">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs px-1 py-0.5 rounded-md border border-slate-100">
                        <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-rose-500'}`}></div>
                      </div>
                    </div>

                    {/* Food Details */}
                    <div className="ml-3.5 flex-grow flex flex-col justify-between py-0.5">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-[14px] leading-snug tracking-tight">{item.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 leading-relaxed">{item.description}</p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="font-black text-slate-800 text-[14px]">₹{item.price.toFixed(2)}</span>
                        
                        {/* Plus/Minus counter */}
                        {cartItem ? (
                          <div 
                            className="flex items-center space-x-2 bg-slate-100 rounded-full p-1 border border-slate-200/50"
                            onClick={(e) => e.stopPropagation()} // Prevent card navigation
                          >
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer active:scale-90 transition-transform"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-black text-xs text-slate-800 px-1">{cartItem.quantity}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer active:scale-90 transition-transform"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card navigation
                              addToCart(item);
                            }}
                            disabled={!item.available}
                            className="tap-bounce flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-full text-white text-[10px] font-black tracking-wide cursor-pointer transition-transform"
                            style={{ backgroundColor: tenant.theme.primary }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>ADD</span>
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {/* Sold out overlay */}
                    {!item.available && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-10 pointer-events-none">
                        <span className="bg-slate-800 text-white px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </main>

        {/* Dynamic Restaurant Social Accounts & Footer */}
        <div className="w-full bg-white border-t border-slate-150/80 mt-auto">
          {/* Social media redirect icons */}
          <div className="flex justify-center items-center space-x-5 py-3 border-b border-slate-100/50">
            {tenant.socials?.instagram && (
              <a 
                href={tenant.socials.instagram} 
                target="_blank" 
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/50 hover:scale-110 active:scale-95 transition-transform"
                style={{ color: tenant.theme.primary }}
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
            )}
            {tenant.socials?.facebook && (
              <a 
                href={tenant.socials.facebook} 
                target="_blank" 
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/50 hover:scale-110 active:scale-95 transition-transform"
                style={{ color: tenant.theme.primary }}
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            )}
            {tenant.socials?.whatsapp && (
              <a 
                href={`https://wa.me/${tenant.socials.whatsapp.replace(/[^0-9]/g, '')}`} 
                target="_blank" 
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/50 hover:scale-110 active:scale-95 transition-transform"
                style={{ color: tenant.theme.primary }}
              >
                <MessageSquare className="w-4.5 h-4.5" />
              </a>
            )}
            {tenant.socials?.website && (
              <a 
                href={tenant.socials.website} 
                target="_blank" 
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/50 hover:scale-110 active:scale-95 transition-transform"
                style={{ color: tenant.theme.primary }}
              >
                <Globe className="w-4.5 h-4.5" />
              </a>
            )}
          </div>

          {/* Footer copyright */}
          <footer className="py-2.5 text-center bg-slate-50/50">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              © {new Date().getFullYear()} {tenant.name}
            </span>
          </footer>
        </div>

        {/* Floating Bottom Basket Drawer */}
        <AnimatePresence>
          {cart.length > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-50 max-w-md mx-auto p-4 flex flex-col justify-end pointer-events-none">
              {isCartOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCartOpen(false)}
                  className="fixed inset-0 bg-black/60 pointer-events-auto z-40"
                />
              )}

              <motion.div
                layout
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 200, opacity: 0 }}
                className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 pointer-events-auto flex flex-col max-h-[85vh] overflow-hidden z-50 border border-slate-800"
              >
                <div 
                  className="flex items-center justify-between cursor-pointer pb-2"
                  onClick={() => setIsCartOpen(!isCartOpen)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/10 p-2.5 rounded-xl border border-white/5 relative">
                      <ShoppingBag className="w-5 h-5 text-white" />
                      <span 
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 text-[10px] font-black text-white rounded-full flex items-center justify-center shadow-md"
                        style={{ backgroundColor: tenant.theme.primary }}
                      >
                        {cartItemCount}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm tracking-tight">Your Basket</h3>
                      <p className="text-xs text-slate-400 font-medium">Total: <span className="text-white font-extrabold">₹{cartTotal.toFixed(2)}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-400 font-bold underline">
                      {isCartOpen ? 'Collapse' : 'View Items'}
                    </span>
                    <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isCartOpen ? 'rotate-95' : '-rotate-95'}`} />
                  </div>
                </div>

                <AnimatePresence>
                  {isCartOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-slate-800 mt-3 pt-3 flex-grow flex flex-col justify-end animate-none"
                    >
                      <div className="space-y-3 overflow-y-auto max-h-[40vh] pr-1 no-scrollbar">
                        {cart.map((cartItem) => (
                          <div key={cartItem.item.id} className="flex items-center justify-between text-sm py-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-extrabold text-xs text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md">
                                {cartItem.quantity}x
                              </span>
                              <span className="font-semibold text-slate-200">{cartItem.item.name}</span>
                            </div>
                            <div className="flex items-center space-x-3.5">
                              <span className="font-black text-slate-200">₹{(cartItem.item.price * cartItem.quantity).toFixed(2)}</span>
                              <button
                                onClick={() => removeFromCart(cartItem.item.id)}
                                className="text-rose-400 hover:text-rose-500 font-extrabold text-xs cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 border-t border-slate-800 pt-3">
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">Chef Instructions / Notes</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Extra spicy, allergy warnings..." 
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-slate-600 placeholder:text-slate-500"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <button
                    disabled={isOrderPlacing}
                    onClick={handlePlaceOrder}
                    className="w-full text-center font-extrabold text-sm py-3 rounded-xl flex items-center justify-center space-x-2 text-white shadow-lg cursor-pointer hover:brightness-105 active:scale-98 transition-transform disabled:opacity-50"
                    style={{ backgroundColor: tenant.theme.primary }}
                  >
                    {isOrderPlacing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span>Sending to Kitchen...</span>
                      </>
                    ) : (
                      <>
                        <span>Place Table Order</span>
                        <ChevronRight className="w-4.5 h-4.5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default CustomerMenu;
