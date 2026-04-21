import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Train, Hotel, Users, Search, ShoppingBag } from 'lucide-react';

interface DashboardStats {
  users: number;
  searches: number;
  orders: number;
  cache: {
    transport_connections: number;
    accommodations: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    adminApi.dashboard().then((res) => setStats(res.data as DashboardStats));
  }, []);

  if (!stats) return <AdminLayout><LoadingSpinner /></AdminLayout>;

  const cards = [
    { label: 'Uživatelé', value: stats.users, icon: Users, color: 'bg-orange-50 text-orange-600' },
    { label: 'Uložená hledání', value: stats.searches, icon: Search, color: 'bg-pink-50 text-pink-600' },
    { label: 'Objednávky', value: stats.orders, icon: ShoppingBag, color: 'bg-teal-50 text-teal-600' },
    { label: 'Cache: spoje', value: stats.cache.transport_connections, icon: Train, color: 'bg-green-50 text-green-600' },
    { label: 'Cache: ubytování', value: stats.cache.accommodations, icon: Hotel, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Přehled</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow p-5">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{value.toLocaleString('cs-CZ')}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm">
        Cache spojů a ubytování se plní automaticky při vyhledávání uživatelů (Transitous MOTIS + Overpass).
        TTL je 15 min pro dopravu a 24 h pro ubytování.
      </div>
    </AdminLayout>
  );
}
