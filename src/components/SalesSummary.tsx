import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Order } from '../types';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Calendar } from 'lucide-react';

interface SalesSummaryProps {
  onBack: () => void;
}

export default function SalesSummary({ onBack }: SalesSummaryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders: Order[] = [];
      snapshot.forEach((doc) => {
        fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalOrders = orders.length;
  const totalItemsSold = orders.reduce((sum, order) => {
    return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">สรุปยอดขาย</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <DollarSign size={32} />
            </div>
            <div>
              <p className="text-gray-500 font-medium">ยอดขายรวม</p>
              <h2 className="text-3xl font-bold text-gray-800">฿{totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</h2>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <ShoppingBag size={32} />
            </div>
            <div>
              <p className="text-gray-500 font-medium">จำนวนออเดอร์</p>
              <h2 className="text-3xl font-bold text-gray-800">{totalOrders} <span className="text-lg font-normal text-gray-500">รายการ</span></h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
              <TrendingUp size={32} />
            </div>
            <div>
              <p className="text-gray-500 font-medium">สินค้าที่ขายได้</p>
              <h2 className="text-3xl font-bold text-gray-800">{totalItemsSold} <span className="text-lg font-normal text-gray-500">ชิ้น</span></h2>
            </div>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">ประวัติการขายล่าสุด</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-semibold text-gray-600">รหัสออเดอร์</th>
                  <th className="p-4 font-semibold text-gray-600">วัน-เวลา</th>
                  <th className="p-4 font-semibold text-gray-600">รายการสินค้า</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      ยังไม่มีประวัติการขาย
                    </td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-mono text-gray-500">{order.id?.slice(0, 8).toUpperCase()}</td>
                      <td className="p-4 text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          {formatDate(order.timestamp)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {order.items.map((item, idx) => (
                            <span key={idx} className="text-sm text-gray-700">
                              {item.quantity}x {item.title}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-orange-600">
                        ฿{order.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
