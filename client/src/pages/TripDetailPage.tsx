import { useState, lazy, Suspense, Component, type ReactNode } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ScoredCombo, Place, TransportType } from '../types';
import { formatPrice, formatDuration, formatTime } from '../utils/formatters';
import ScoreBreakdown from '../components/results/ScoreBreakdown';
import { favoriteApi } from '../api/favoriteApi';
import { orderApi } from '../api/orderApi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import PaymentModal from '../components/payment/PaymentModal';
import {
  ArrowLeft, Train, Bus, TramFront, Footprints, Hotel, Clock, ArrowRight,
  Heart, Star, MapPin, CheckCircle, ChevronRight, ShoppingCart,
} from 'lucide-react';

const MapRoute = lazy(() => import('../components/map/MapRoute'));

class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: string }> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(err: Error) { return { hasError: true, error: err.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-40 flex flex-col items-center justify-center text-gray-400 gap-2">
          <MapPin size={24} />
          <span className="text-sm">Mapu nelze zobrazit</span>
        </div>
      );
    }
    return this.props.children;
  }
}

interface LocationState {
  combo: ScoredCombo;
  nights: number;
  originName: string;
  destName: string;
  date: string;
  returnDate: string;
  origin?: Place | null;
  destination?: Place | null;
}

const transportLabels: Record<TransportType, string> = {
  train: 'Vlak',
  bus: 'Autobus',
  tram: 'Tramvaj',
  metro: 'Metro',
  walk: 'Pěšky',
  car: 'Auto',
};

function IconForType({ type }: { type: TransportType }) {
  switch (type) {
    case 'train':
      return <Train size={16} className="text-blue-600" />;
    case 'tram':
    case 'metro':
      return <TramFront size={16} className="text-red-600" />;
    case 'walk':
      return <Footprints size={16} className="text-gray-500" />;
    case 'bus':
    default:
      return <Bus size={16} className="text-green-600" />;
  }
}

function getAccImage(name: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(name + '-main')}/600/400`;
}

function TransportTimeline({ route, date, label }: {
  route: ScoredCombo['outbound_route'];
  date: string;
  label: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
        {label === 'Tam'
          ? <ArrowRight size={20} className="text-blue-600" />
          : <ArrowLeft size={20} className="text-green-600" />}
        Jízda {label} — {new Date(date).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}
      </h3>

      <div className="space-y-0">
        {route.segments.map((seg, i) => {
          const isLast = i === route.segments.length - 1;
          return (
            <div key={i}>
              <div className="flex gap-4 items-start">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-600 mt-1" />
                  <div className={`w-0.5 bg-gray-300 flex-1 ${isLast ? 'h-16' : 'h-16'}`} />
                </div>
                <div className="pb-4 w-full">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">{formatTime(seg.departureTime)}</span>
                    <span className="text-gray-500 text-sm">Odjezd — {seg.originStopName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <IconForType type={seg.transportType} />
                    <span className="text-sm font-medium text-blue-700">
                      {seg.carrierName || transportLabels[seg.transportType]}
                      {seg.routeShortName ? ` · ${seg.routeShortName}` : ''}
                    </span>
                    <span className="text-sm text-gray-500 ml-auto">{formatDuration(seg.durationMinutes)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-1 ${isLast ? 'bg-green-600' : 'bg-orange-400'}`} />
                  {!isLast && <div className="w-0.5 bg-gray-300 h-10" />}
                </div>
                <div className="pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">{formatTime(seg.arrivalTime)}</span>
                    <span className="text-gray-500 text-sm">Příjezd — {seg.destStopName}</span>
                    {seg.transportType !== 'walk' && (
                      <span className="text-sm font-semibold text-gray-700">{formatPrice(seg.priceCzk)}</span>
                    )}
                  </div>
                </div>
              </div>

              {!isLast && route.segments[i + 1] && (
                <div className="flex gap-4 mb-2">
                  <div className="w-3" />
                  <div className="ml-1 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700">
                    <Clock size={14} />
                    Přestup — čekání na navazující spoj
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-4 border-t border-gray-100 flex justify-between text-sm">
        <span className="text-gray-500">
          Celková doba: <strong>{formatDuration(route.totalDurationMinutes)}</strong>
          {route.transfers > 0 && ` · ${route.transfers} přestup${route.transfers > 1 ? 'y' : ''}`}
        </span>
        <span className="font-semibold text-gray-800">{formatPrice(route.totalPriceCzk)}</span>
      </div>
      <p className="text-xs text-gray-400 mt-2">Orientační cena — skutečná tarifní cena se může lišit.</p>
    </div>
  );
}

export default function TripDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  let state = location.state as LocationState | null;
  if (!state?.combo) {
    try {
      const stored = sessionStorage.getItem('tripDetail');
      if (stored) state = JSON.parse(stored) as LocationState;
    } catch {
      // ignore
    }
  }

  const [showPayment, setShowPayment] = useState(false);

  if (!state?.combo) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Žádná cestovní kombinace není k dispozici.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">← Zpět</button>
      </div>
    );
  }

  const { combo, nights, originName, destName, date, returnDate, origin, destination } = state;
  const acc = combo.accommodation;
  const accPricePerNight = acc.price_per_night !== null ? Number(acc.price_per_night) : null;
  const accTotal = accPricePerNight !== null ? accPricePerNight * nights : 0;

  const mapSegments = combo.outbound_route.segments;

  const handleSave = async () => {
    if (!user) { toast.error('Pro uložení se přihlaste.'); return; }
    try {
      await favoriteApi.addFavorite({
        combo_snapshot: combo,
        total_score: combo.total_score,
        total_price_czk: combo.total_price_czk,
      });
      toast.success('Uloženo do oblíbených!');
    } catch {
      toast.error('Nepodařilo se uložit.');
    }
  };

  const handleBuy = () => {
    if (!user) {
      toast.error('Pro nákup se přihlaste.');
      navigate('/prihlaseni');
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentConfirm = async () => {
    const result = await orderApi.create({
      outbound_snapshot: combo.outbound_route,
      return_snapshot: combo.return_route,
      accommodation_snapshot: acc,
      nights,
      total_price_czk: combo.total_price_czk,
      route_snapshot: {
        originName,
        destName,
        date,
        returnDate,
      },
    });

    return { orderId: result.order.id, paymentRef: result.payment_ref };
  };

  const handlePaymentSuccess = (_orderId: number, _ref: string) => {
    toast.success('Jízdenka zakoupena!');
    setShowPayment(false);
    navigate('/profil', { state: { activeTab: 'orders' } });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft size={18} /> Zpět na výsledky
      </button>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm text-blue-200 mb-1">Vaše cestovní kombinace</div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {originName}
              <ArrowRight size={24} />
              {destName}
            </h1>
            <p className="text-blue-200 mt-1">
              {new Date(date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}
              {' — '}
              {new Date(returnDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}
              {nights} {nights === 1 ? 'noc' : nights < 5 ? 'noci' : 'nocí'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{formatPrice(combo.total_price_czk)}</div>
            <div className="text-blue-200 text-sm">celkem za cestu</div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div className="bg-white/20 rounded-xl px-4 py-2 flex items-center gap-2">
            <Star size={18} className="text-yellow-300" />
            <span className="font-bold text-xl">{Math.round(combo.total_score * 100)}</span>
            <span className="text-blue-200">/ 100 bodů komfortu</span>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2 font-medium"
          >
            <Heart size={18} /> Uložit
          </button>
          <button
            onClick={handleBuy}
            className="ml-auto flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 rounded-xl px-5 py-2 font-bold shadow"
          >
            <ShoppingCart size={18} /> Koupit
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {mapSegments.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
              <MapPin size={20} className="text-blue-600" /> Mapa trasy
            </h3>
            <MapErrorBoundary>
              <Suspense fallback={<div className="h-80 flex items-center justify-center text-gray-400">Načítám mapu…</div>}>
                <MapRoute segments={mapSegments} height="340px" />
              </Suspense>
            </MapErrorBoundary>
          </div>
        )}

        <TransportTimeline route={combo.outbound_route} date={date} label="Tam" />

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="relative">
            <img
              src={acc.image_url || getAccImage(acc.name)}
              alt={acc.name}
              className="w-full h-56 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(acc.id)}/600/400`; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Hotel size={18} />
                <span className="text-sm font-medium uppercase tracking-wide opacity-80">Ubytování</span>
              </div>
              <h3 className="text-2xl font-bold">{acc.name}</h3>
              {acc.address && (
                <p className="text-sm opacity-80 flex items-center gap-1 mt-1">
                  <MapPin size={13} /> {acc.address}
                </p>
              )}
            </div>
            {acc.star_rating && (
              <div className="absolute top-4 right-4 text-white text-lg font-bold w-12 h-12 rounded-xl flex items-center justify-center bg-yellow-500">
                {Number(acc.star_rating).toFixed(0)}★
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-800">{nights}</div>
                <div className="text-xs text-gray-500">{nights === 1 ? 'noc' : 'nocí'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-800">
                  {accPricePerNight !== null ? formatPrice(accPricePerNight) : 'na vyžádání'}
                </div>
                <div className="text-xs text-gray-500">za noc</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center col-span-2">
                <div className="text-lg font-bold text-blue-700">
                  {accPricePerNight !== null ? formatPrice(accTotal) : '—'}
                </div>
                <div className="text-xs text-gray-500">ubytování celkem</div>
              </div>
            </div>

            {acc.description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-4">{acc.description}</p>
            )}

            {acc.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {acc.amenities.map((a) => (
                  <span key={a} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full">
                    <CheckCircle size={12} className="text-green-500" /> {a}
                  </span>
                ))}
              </div>
            )}

            <Link
              to={`/ubytovani/${acc.external_id.replace('/', '__')}`}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              Zobrazit úplný detail ubytování <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        <TransportTimeline route={combo.return_route} date={returnDate} label="Zpět" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Přehled nákladů</h3>
            <div className="space-y-3">
              {[
                { label: `Doprava tam (${combo.outbound_route.transfers === 0 ? 'přímé' : `${combo.outbound_route.transfers} přestup`})`, value: combo.outbound_route.totalPriceCzk },
                { label: `Ubytování (${nights} ${nights === 1 ? 'noc' : 'nocí'}${accPricePerNight !== null ? ` × ${formatPrice(accPricePerNight)}` : ''})`, value: accTotal },
                { label: `Doprava zpět (${combo.return_route.transfers === 0 ? 'přímé' : `${combo.return_route.transfers} přestup`})`, value: combo.return_route.totalPriceCzk },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium">{formatPrice(value)}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>Celkem</span>
                <span className="text-blue-700">{formatPrice(combo.total_price_czk)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Hodnocení kombinace</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-600 text-white text-3xl font-bold w-16 h-16 rounded-2xl flex items-center justify-center">
                {Math.round(combo.total_score * 100)}
              </div>
              <div>
                <div className="font-semibold text-gray-800">
                  {combo.total_score >= 0.85 ? 'Výjimečná kombinace' :
                   combo.total_score >= 0.7 ? 'Skvělá volba' :
                   combo.total_score >= 0.5 ? 'Dobrá volba' : 'Dostupná varianta'}
                </div>
                <div className="text-sm text-gray-500">celkové skóre komfortu</div>
              </div>
            </div>
            <ScoreBreakdown scores={combo.normalized_scores} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white text-center">
          <h3 className="text-xl font-bold mb-2">Vše připraveno k rezervaci!</h3>
          <p className="text-green-100 mb-4">
            Doprava + ubytování za <strong>{formatPrice(combo.total_price_czk)}</strong> celkem
          </p>
          <button
            onClick={handleBuy}
            className="bg-white text-green-700 hover:bg-green-50 font-bold py-3 px-10 rounded-xl text-lg shadow flex items-center gap-2 mx-auto"
          >
            <ShoppingCart size={22} /> Koupit celý balíček
          </button>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          totalPrice={combo.total_price_czk}
          onConfirm={handlePaymentConfirm}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
