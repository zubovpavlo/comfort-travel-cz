import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import PreferenceSliders from '../components/search/PreferenceSliders';
import { RecommendationWeights, ScoredCombo } from '../types';
import { orderApi, Order } from '../api/orderApi';
import toast from 'react-hot-toast';
import { User, Save, ShoppingBag, Package, XCircle, Star, History, ChevronRight, MessageSquare } from 'lucide-react';
import { formatPrice } from '../utils/formatters';

type Tab = 'profile' | 'active' | 'history';

function parseReturnDate(order: Order): Date | null {
  const snap = order.route_snapshot as { returnDate?: string } | null;
  if (!snap?.returnDate) return null;
  const d = new Date(snap.returnDate);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isCompleted(order: Order): boolean {
  if (order.status !== 'confirmed') return false;
  const rd = parseReturnDate(order);
  return rd !== null && rd.getTime() <= Date.now();
}

function StarRating({ value, onChange, size = 24, readonly = false }: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange?.(n)}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}
        >
          <Star
            size={size}
            className={n <= display ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewSection({ order, onReviewed }: { order: Order; onReviewed: (o: Order) => void }) {
  const [rating, setRating] = useState<number>(order.rating ?? 0);
  const [text, setText] = useState<string>(order.review_text ?? '');
  const [editing, setEditing] = useState<boolean>(order.rating === null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      toast.error('Vyberte hodnocení 1–5 hvězd.');
      return;
    }
    setSaving(true);
    try {
      const { order: updated } = await orderApi.review(order.id, rating, text.trim() || null);
      onReviewed(updated);
      setEditing(false);
      toast.success('Hodnocení uloženo.');
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? 'Nepodařilo se uložit hodnocení.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing && order.rating !== null) {
    return (
      <div className="border-t border-gray-100 pt-3 mt-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <StarRating value={order.rating} size={18} readonly />
            <span className="text-sm text-gray-600">{order.rating}/5</span>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Upravit hodnocení
          </button>
        </div>
        {order.review_text && (
          <p className="text-sm text-gray-700 italic mt-1">"{order.review_text}"</p>
        )}
        {order.reviewed_at && (
          <p className="text-xs text-gray-400 mt-1">
            Hodnoceno {new Date(order.reviewed_at).toLocaleDateString('cs-CZ')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Ohodnoťte svou cestu</span>
      </div>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Napište, jak se vám cestovalo (nepovinné)…"
        rows={3}
        maxLength={2000}
        className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving || rating < 1}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
        >
          {saving ? 'Ukládání…' : 'Odeslat hodnocení'}
        </button>
        {order.rating !== null && (
          <button
            onClick={() => { setEditing(false); setRating(order.rating ?? 0); setText(order.review_text ?? ''); }}
            className="px-4 py-1.5 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Zrušit
          </button>
        )}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  showReview,
  onCancel,
  onDetail,
  onReviewed,
}: {
  order: Order;
  showReview: boolean;
  onCancel?: (id: number) => void;
  onDetail: (order: Order) => void;
  onReviewed: (o: Order) => void;
}) {
  const snapshot = order.route_snapshot as { originName?: string; destName?: string; date?: string; returnDate?: string } | null;
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
            {snapshot?.date && snapshot?.returnDate ? (
              <>
                {new Date(snapshot.date).toLocaleDateString('cs-CZ')} – {new Date(snapshot.returnDate).toLocaleDateString('cs-CZ')}
              </>
            ) : order.created_at ? (
              new Date(order.created_at).toLocaleDateString('cs-CZ')
            ) : ''}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          order.status === 'cancelled'
            ? 'bg-red-100 text-red-600'
            : showReview
              ? 'bg-gray-100 text-gray-600'
              : 'bg-green-100 text-green-700'
        }`}>
          {order.status === 'cancelled' ? 'Zrušeno' : showReview ? 'Dokončeno' : 'Potvrzeno'}
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

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onDetail(order)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50"
        >
          Detail cesty <ChevronRight size={14} />
        </button>
        {order.status === 'confirmed' && !showReview && onCancel && (
          <button
            onClick={() => onCancel(order.id)}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
          >
            <XCircle size={15} /> Zrušit objednávku
          </button>
        )}
      </div>

      {showReview && <ReviewSection order={order} onReviewed={onReviewed} />}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
    if (activeTab === 'active' || activeTab === 'history') {
      setOrdersLoading(true);
      orderApi.getMyOrders()
        .then((r) => setOrders(r.orders))
        .catch(() => toast.error('Nepodařilo se načíst objednávky.'))
        .finally(() => setOrdersLoading(false));
    }
  }, [activeTab]);

  const activeOrders = orders.filter((o) => !isCompleted(o));
  const historyOrders = orders.filter((o) => isCompleted(o));

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

  const handleDetail = (order: Order) => {
    const snap = order.route_snapshot as { originName?: string; destName?: string; date?: string; returnDate?: string } | null;
    const combo: ScoredCombo = {
      outbound_route: order.outbound_snapshot,
      return_route: order.return_snapshot,
      accommodation: order.accommodation_snapshot!,
      total_price_czk: Number(order.total_price_czk),
      total_travel_minutes:
        (order.outbound_snapshot.totalDurationMinutes ?? 0) +
        (order.return_snapshot.totalDurationMinutes ?? 0),
      comfort_score: 0,
      accommodation_rating: order.accommodation_snapshot?.star_rating ?? 0,
      normalized_scores: { price: 0, travel_time: 0, comfort: 0, rating: 0 },
      total_score: 0,
    };
    navigate('/detail', {
      state: {
        combo,
        nights: order.nights,
        originName: snap?.originName ?? '',
        destName: snap?.destName ?? '',
        date: snap?.date ?? '',
        returnDate: snap?.returnDate ?? '',
      },
    });
  };

  const handleReviewed = (updated: Order) => {
    setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, ...updated } : o));
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'profile', label: 'Profil', icon: <User size={18} /> },
    { key: 'active', label: 'Aktivní cesty', icon: <ShoppingBag size={18} /> },
    { key: 'history', label: 'Historie', icon: <History size={18} /> },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-6">
        <User className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-800">Můj účet</h1>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

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

      {activeTab === 'active' && (
        <div className="space-y-4">
          {ordersLoading ? (
            <div className="text-center py-12 text-gray-400">Načítám objednávky…</div>
          ) : activeOrders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-12 text-center">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">Žádné aktivní cesty</p>
              <p className="text-gray-400 text-sm mt-1">Vyhledejte cestu a kupte svůj balíček!</p>
            </div>
          ) : (
            activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                showReview={false}
                onCancel={handleCancelOrder}
                onDetail={handleDetail}
                onReviewed={handleReviewed}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {ordersLoading ? (
            <div className="text-center py-12 text-gray-400">Načítám historii…</div>
          ) : historyOrders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-12 text-center">
              <History size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">Zatím žádné dokončené cesty</p>
              <p className="text-gray-400 text-sm mt-1">Po návratu z cesty zde budete moci přidat hodnocení.</p>
            </div>
          ) : (
            historyOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                showReview
                onDetail={handleDetail}
                onReviewed={handleReviewed}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
