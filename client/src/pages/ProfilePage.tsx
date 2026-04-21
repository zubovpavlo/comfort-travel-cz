import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import PreferenceSliders from '../components/search/PreferenceSliders';
import { RecommendationWeights } from '../types';
import { orderApi, Order } from '../api/orderApi';
import toast from 'react-hot-toast';
import { User, Save, ShoppingBag, Package, XCircle } from 'lucide-react';
import { formatPrice } from '../utils/formatters';

type Tab = 'profile' | 'orders';

function OrderCard({ order, onCancel }: { order: Order; onCancel: (id: number) => void }) {
  const snapshot = order.route_snapshot as { originName?: string; destName?: string } | null;
  const totalPrice = Number(order.total_price_czk);
  const accName = order.accommodation_snapshot?.name ?? null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-bold text-gray-800">
            {snapshot?.originName && snapshot?.destName
              ? `${snapshot.originName} → ${snapshot.destName}`
              : `Objednávka #${order.id}`}
          </div>
          <div className="text-sm text-gray-500">
            {order.created_at ? new Date(order.created_at).toLocaleDateString('cs-CZ', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            }) : ''}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          order.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
        }`}>
          {order.status === 'confirmed' ? 'Potvrzeno' : 'Zrušeno'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-3">
        {order.nights > 0 && (
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="font-bold">{order.nights}</div>
            <div className="text-gray-500 text-xs">{order.nights === 1 ? 'noc' : 'nocí'}</div>
          </div>
        )}
        {accName && (
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="font-medium text-blue-700 truncate">{accName}</div>
            <div className="text-gray-500 text-xs">Ubytování</div>
          </div>
        )}
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="font-bold text-green-700">{formatPrice(totalPrice)}</div>
          <div className="text-gray-500 text-xs">Celková cena</div>
        </div>
      </div>

      {order.payment_ref && (
        <div className="text-xs text-gray-400 mb-3">
          Ref: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{order.payment_ref}</code>
        </div>
      )}

      {order.status === 'confirmed' && (
        <button
          onClick={() => onCancel(order.id)}
          className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
        >
          <XCircle size={15} /> Zrušit objednávku
        </button>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const locationState = location.state as { activeTab?: Tab } | null;

  if (!user) return <Navigate to="/prihlaseni" />;

  const [activeTab, setActiveTab] = useState<Tab>(locationState?.activeTab ?? 'profile');
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [weights, setWeights] = useState<RecommendationWeights>({
    price: Number(user.pref_price) || 0.35,
    travel_time: Number(user.pref_time) || 0.25,
    comfort: Number(user.pref_comfort) || 0.25,
    rating: Number(user.pref_rating) || 0.15,
  });
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'orders') {
      setOrdersLoading(true);
      orderApi.getMyOrders()
        .then((r) => setOrders(r.orders))
        .catch(() => toast.error('Nepodařilo se načíst objednávky.'))
        .finally(() => setOrdersLoading(false));
    }
  }, [activeTab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({
        first_name: firstName,
        last_name: lastName,
        pref_price: weights.price,
        pref_time: weights.travel_time,
        pref_comfort: weights.comfort,
        pref_rating: weights.rating,
      } as any);
      toast.success('Profil uložen.');
    } catch {
      toast.error('Chyba při ukládání.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelOrder = async (id: number) => {
    try {
      await orderApi.cancel(id);
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: 'cancelled' } : o));
      toast.success('Objednávka zrušena.');
    } catch {
      toast.error('Nepodařilo se zrušit objednávku.');
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profil', icon: <User size={18} /> },
    { key: 'orders', label: 'Objednávky', icon: <ShoppingBag size={18} /> },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-6">
        <User className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-800">Můj účet</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              value={user.email}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jméno</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Příjmení</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Výchozí preference hledání</h3>
            <PreferenceSliders weights={weights} onChange={setWeights} />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
          >
            <Save size={18} /> {saving ? 'Ukládání...' : 'Uložit změny'}
          </button>
        </div>
      )}

      {/* Orders tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {ordersLoading ? (
            <div className="text-center py-12 text-gray-400">Načítám objednávky…</div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-12 text-center">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">Zatím žádné objednávky</p>
              <p className="text-gray-400 text-sm mt-1">Vyhledejte cestu a kupte svůj první balíček!</p>
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard key={order.id} order={order} onCancel={handleCancelOrder} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
