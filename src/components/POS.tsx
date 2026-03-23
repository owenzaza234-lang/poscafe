import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { LogOut, Search, ShoppingCart, Trash2, Coffee, Settings, BarChart3 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { CafeItem, CartItem } from '../types';
import ManageProducts from './ManageProducts';
import SalesSummary from './SalesSummary';

export default function POS() {
  const [items, setItems] = useState<CafeItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'pos' | 'manage' | 'summary'>('pos');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'cafe'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems: CafeItem[] = [];
      const cats = new Set<string>();
      
      // Default categories
      cats.add('กาแฟ');
      cats.add('เบเกอรี่');

      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<CafeItem, 'id'>;
        fetchedItems.push({ id: doc.id, ...data });
        if (data.category) cats.add(data.category);
      });
      setItems(fetchedItems);
      setCategories(['All', ...Array.from(cats)]);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching cafe items:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addToCart = (item: CafeItem) => {
    if (item.status === 'Sold Out') return;
    
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    }));
  };

  const clearCart = () => {
    if (window.confirm('Are you sure you want to clear the bill?')) {
      setCart([]);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      const orderData = {
        items: cart,
        totalAmount: total,
        timestamp: serverTimestamp(),
        cashierId: auth.currentUser?.uid || 'unknown'
      };
      await addDoc(collection(db, 'orders'), orderData);
      alert(`ชำระเงินสำเร็จ! ยอดรวม: ฿${total.toFixed(2)}`);
      setCart([]);
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("เกิดข้อผิดพลาดในการชำระเงิน");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (view === 'manage') {
    return <ManageProducts onBack={() => setView('pos')} />;
  }

  if (view === 'summary') {
    return <SalesSummary onBack={() => setView('pos')} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">โซนเลือกสินค้า</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 w-64"
              />
            </div>
            <button
              onClick={() => setView('summary')}
              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
              title="Sales Summary"
            >
              <BarChart3 size={24} />
            </button>
            <button
              onClick={() => setView('manage')}
              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
              title="Manage Products"
            >
              <Settings size={24} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={24} />
            </button>
          </div>
        </header>

        {/* Categories */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 overflow-x-auto">
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingCart size={48} className="mb-4 opacity-20" />
              <p className="text-lg">ไม่พบสินค้า</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border border-transparent hover:border-orange-500 group relative ${
                    item.status === 'Sold Out' ? 'opacity-60 grayscale' : ''
                  }`}
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Coffee size={48} />
                      </div>
                    )}
                    {item.detail && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4 text-center">
                        <p className="text-white text-sm font-medium">{item.detail}</p>
                      </div>
                    )}
                    {item.status === 'Sold Out' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-red-600 text-white px-4 py-1 rounded-full font-bold transform -rotate-12 border-2 border-white">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="font-semibold text-gray-800 line-clamp-1">{item.title}</h3>
                    <p className="text-orange-600 font-bold mt-1">
                      {item.price.toFixed(2)}.- {item.unit ? `/${item.unit}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 bg-white border-l border-gray-200 shadow-2xl flex flex-col z-20">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart /> Bills
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart size={48} className="mb-4 opacity-20" />
              <p>ยังไม่มีสินค้าในบิล</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 line-clamp-1">{item.title}</h4>
                    <div className="text-orange-600 font-medium">{(item.price * item.quantity).toFixed(2)}.-</div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center bg-gray-100 rounded-lg">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-lg transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-lg transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-semibold text-gray-600">ยอดรวมสุทธิ</span>
            <span className="text-3xl font-bold text-red-600">{total.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              className="py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
            >
              พักบิล
            </button>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="py-3 px-4 border-2 border-red-500 text-red-500 hover:bg-red-50 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ยกเลิกบิล
            </button>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isCheckingOut ? 'กำลังดำเนินการ...' : 'ชำระเงิน (Charge)'}
          </button>
        </div>
      </div>
    </div>
  );
}
