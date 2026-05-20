import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  UploadCloud, 
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Globe
} from 'lucide-react';

const ProductDetail = () => {
  const { tenantId, tableId, itemId } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();

  const [tenant, setTenant] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  
  // Gallery media list
  const [mediaList, setMediaList] = useState([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const apiHost = `http://${window.location.hostname}:4000`;

  // Join Room for Multi-tenant sockets to receive real-time menu modifications
  useEffect(() => {
    if (socket && connected && tenantId) {
      socket.emit('join-tenant', tenantId);

      socket.on('menu-updated', (updatedMenu) => {
        const foundItem = updatedMenu.find(item => item.id === itemId);
        if (foundItem) {
          setProduct(foundItem);
          const mediaArray = foundItem.media && foundItem.media.length > 0 
            ? foundItem.media 
            : [{ type: 'image', url: foundItem.image }];
          setMediaList(mediaArray);
        }
      });

      return () => {
        socket.off('menu-updated');
      };
    }
  }, [socket, connected, tenantId, itemId]);

  // Load tenant, menu & cart
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tenantRes, menuRes] = await Promise.all([
          fetch(`${apiHost}/api/tenants/${tenantId}`),
          fetch(`${apiHost}/api/tenants/${tenantId}/menu`)
        ]);

        if (!tenantRes.ok || !menuRes.ok) throw new Error('Restaurant details offline');

        const tenantData = await tenantRes.json();
        const menuData = await menuRes.json();
        const foundItem = menuData.find(item => item.id === itemId);

        setTenant(tenantData);
        setProduct(foundItem);

        if (foundItem) {
          // Initialize gallery with sqlite media items or fallback to single image
          const mediaArray = foundItem.media && foundItem.media.length > 0 
            ? foundItem.media 
            : [{ type: 'image', url: foundItem.image }];
          setMediaList(mediaArray);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Load persisted cart
    const savedCart = localStorage.getItem(`qr-cart-${tenantId}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, [tenantId, itemId]);

  // Persist cart changes
  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem(`qr-cart-${tenantId}`, JSON.stringify(newCart));
  };

  // Add/Remove handlers
  const handleIncrease = () => {
    if (!product) return;
    const existing = cart.find(c => c.item.id === product.id);
    if (existing) {
      saveCart(cart.map(c => c.item.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      saveCart([...cart, { item: product, quantity: 1 }]);
    }
  };

  const handleDecrease = () => {
    if (!product) return;
    const existing = cart.find(c => c.item.id === product.id);
    if (!existing) return;
    if (existing.quantity === 1) {
      saveCart(cart.filter(c => c.item.id !== product.id));
    } else {
      saveCart(cart.map(c => c.item.id === product.id ? { ...c, quantity: c.quantity - 1 } : c));
    }
  };

  // Upload simulation to media list (client preview upload)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.startsWith('video/') ? 'video' : 'image';
    const reader = new FileReader();

    reader.onload = (event) => {
      const newMedia = {
        type: fileType,
        url: event.target.result // Base64 data URL
      };
      setMediaList(prev => [...prev, newMedia]);
      setActiveMediaIndex(mediaList.length); // switch index to new slide
    };
    reader.readAsDataURL(file);
  };

  // Next / Prev controls
  const handleNextMedia = () => {
    setActiveMediaIndex(prev => (prev + 1) % mediaList.length);
  };

  const handlePrevMedia = () => {
    setActiveMediaIndex(prev => (prev - 1 + mediaList.length) % mediaList.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        <p className="mt-3 text-slate-500 font-bold text-xs uppercase tracking-wide">Cooking details...</p>
      </div>
    );
  }

  if (!tenant || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <h2 className="text-xl font-extrabold text-slate-800">Dish Not Found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider">
          Go Back
        </button>
      </div>
    );
  }

  const currentCartQuantity = cart.find(c => c.item.id === product.id)?.quantity || 0;

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-between animate-none"
      style={{ backgroundColor: tenant.theme.background }}
    >
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-lg relative border-x border-slate-100/50">
        
        {/* Navigation Bar */}
        <div className="absolute top-4 inset-x-4 z-20 flex justify-between items-center pointer-events-none">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-md cursor-pointer pointer-events-auto hover:scale-105 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>

          <div 
            className="px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide shadow-md bg-white border pointer-events-auto"
            style={{ color: tenant.theme.primary, borderColor: tenant.theme.primary + '20' }}
          >
            Table {tableId}
          </div>
        </div>

        {/* Media Gallery / Screen Display */}
        <div className="w-full aspect-square bg-slate-950 relative overflow-hidden flex items-center justify-center shadow-inner">
          <AnimatePresence mode="wait">
            {mediaList.length > 0 && (
              <motion.div
                key={activeMediaIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex items-center justify-center"
              >
                {mediaList[activeMediaIndex].type === 'video' ? (
                  <video 
                    src={mediaList[activeMediaIndex].url} 
                    controls 
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={mediaList[activeMediaIndex].url} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Left / Right Carousel Controls */}
          {mediaList.length > 1 && (
            <>
              <button
                onClick={handlePrevMedia}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white cursor-pointer hover:bg-black/60 active:scale-90 transition-transform z-20"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMedia}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white cursor-pointer hover:bg-black/60 active:scale-90 transition-transform z-20"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Indicator Dot overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-15">
            <div className="flex space-x-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-1.5 rounded-full">
              {mediaList.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveMediaIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    activeMediaIndex === i ? 'bg-white scale-120' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>

            {/* Custom media file upload triggers */}
            <label className="flex items-center space-x-1 bg-white/95 hover:bg-white backdrop-blur-xs text-slate-800 text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full shadow-md cursor-pointer border border-slate-200 transition-all hover:scale-105 active:scale-95">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Add Media</span>
              <input 
                type="file" 
                accept="image/*,video/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="flex-1 p-5 space-y-6">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <h2 className="font-extrabold text-xl text-slate-800 tracking-tight leading-tight">{product.name}</h2>
              <span className="font-black text-xl text-slate-900 ml-3">₹{product.price.toFixed(2)}</span>
            </div>

            {/* Diet tag & category */}
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${product.isVeg ? 'bg-green-500' : 'bg-rose-500'}`}></span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{product.category}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Description</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">{product.description}</p>
          </div>

          {/* Quantity selector control block */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block leading-none">Order amount</span>
              <span className="text-[10px] font-black text-slate-400 uppercase mt-0.5">Customize portion</span>
            </div>

            {currentCartQuantity > 0 ? (
              <div className="flex items-center space-x-3 bg-white border border-slate-200/60 p-1.5 rounded-full shadow-2xs">
                <button
                  onClick={handleDecrease}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-extrabold transition-all cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-black text-sm text-slate-800 px-2">{currentCartQuantity}</span>
                <button
                  onClick={handleIncrease}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-extrabold transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleIncrease}
                disabled={!product.available}
                className="px-6 py-3 rounded-full text-xs font-black tracking-widest uppercase text-white shadow-md transition-transform cursor-pointer"
                style={{ backgroundColor: tenant.theme.primary }}
              >
                Add to basket
              </button>
            )}
          </div>
        </div>

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

      </div>
    </div>
  );
};

export default ProductDetail;
