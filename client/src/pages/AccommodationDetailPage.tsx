import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { accommodationApi } from '../api/accommodationApi';
import { Accommodation } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StarRating from '../components/common/StarRating';
import { formatPrice } from '../utils/formatters';
import {
  ArrowLeft, MapPin, Wifi, Car, Coffee, Waves, Dumbbell, Bath, CheckCircle,
} from 'lucide-react';

const MapHotel = lazy(() => import('../components/map/MapHotel'));

const amenityIcons: Record<string, { icon: React.ReactNode; label: string }> = {
  wifi:      { icon: <Wifi size={18} />,      label: 'Wi-Fi' },
  parking:   { icon: <Car size={18} />,       label: 'Parkoviště' },
  breakfast: { icon: <Coffee size={18} />,    label: 'Snídaně' },
  pool:      { icon: <Waves size={18} />,     label: 'Bazén' },
  fitness:   { icon: <Dumbbell size={18} />,  label: 'Fitness centrum' },
  spa:       { icon: <Bath size={18} />,      label: 'Spa & wellness' },
  restaurant:{ icon: <Coffee size={18} />,    label: 'Restaurace' },
  kitchen:   { icon: <CheckCircle size={18} />, label: 'Kuchyňka' },
};

const typeLabels: Record<string, string> = {
  hotel: 'Hotel', hostel: 'Hostel', pension: 'Penzion', apartment: 'Apartmán', motel: 'Motel',
};

function getImage(acc: Accommodation, index = 0): string {
  if (acc.image_url && index === 0) return acc.image_url;
  const seeds = [`${acc.name}-main`, `${acc.name}-room`, `${acc.name}-exterior`];
  return `https://picsum.photos/seed/${encodeURIComponent(seeds[index])}/800/500`;
}

export default function AccommodationDetailPage() {
  const { externalId } = useParams<{ externalId: string }>();
  const navigate = useNavigate();
  const [acc, setAcc] = useState<Accommodation | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!externalId) return;
    accommodationApi
      .getById(externalId.replace('__', '/'))
      .then((res) => setAcc(res.data))
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  }, [externalId]);

  if (loading) return <LoadingSpinner text="Načítám ubytování..." />;
  if (!acc) return null;

  const priceLabel = acc.price_per_night !== null ? formatPrice(Number(acc.price_per_night)) : 'Cena na vyžádání';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={18} /> Zpět na výsledky
      </button>

      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
              {typeLabels[acc.type] ?? acc.type}
            </span>
            {acc.star_rating && <StarRating rating={acc.star_rating} />}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{acc.name}</h1>
          {acc.address && (
            <p className="text-gray-500 mt-1 flex items-center gap-1">
              <MapPin size={15} /> {acc.address}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-700">{priceLabel}</div>
          <div className="text-sm text-gray-500">{acc.price_per_night !== null ? 'za noc' : ''}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8 rounded-2xl overflow-hidden">
        <div className="col-span-2 row-span-2">
          <img
            src={getImage(acc, activeImg)}
            alt={acc.name}
            className="w-full h-80 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(acc.id)}/800/500`; }}
          />
        </div>
        {[1, 2].map((i) => (
          <div
            key={i}
            className="cursor-pointer overflow-hidden"
            onClick={() => setActiveImg(i)}
          >
            <img
              src={getImage(acc, i)}
              alt={`${acc.name} ${i}`}
              className="w-full h-[152px] object-cover hover:scale-105 transition-transform"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(acc.id)}-${i}/400/300`; }}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {acc.description && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">O ubytování</h2>
              <p className="text-gray-600 leading-relaxed">{acc.description}</p>
            </div>
          )}

          {acc.amenities.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Vybavení a služby</h2>
              <div className="grid grid-cols-2 gap-3">
                {acc.amenities.map((a) => {
                  const amenity = amenityIcons[a];
                  return (
                    <div key={a} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-blue-600">{amenity?.icon ?? <CheckCircle size={18} />}</span>
                      <span className="text-sm font-medium text-gray-700">{amenity?.label ?? a}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Poloha</h2>
            <Suspense fallback={<div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center text-gray-400">Načítám mapu…</div>}>
              <MapHotel
                name={acc.name}
                lat={Number(acc.latitude)}
                lon={Number(acc.longitude)}
                pricePerNight={acc.price_per_night !== null ? Number(acc.price_per_night) : undefined}
                height="280px"
              />
            </Suspense>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Cena ubytování</h3>
            <div className="text-3xl font-bold text-blue-700 mb-1">{priceLabel}</div>
            {acc.price_per_night !== null && (
              <div className="text-sm text-gray-500">za noc, za pokoj</div>
            )}
            <div className="mt-3 text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
              {acc.price_per_night !== null
                ? 'Cena je orientační a může se lišit podle dostupnosti. Rezervace přes aplikaci ComfortTravel CZ.'
                : 'Ubytovatel nezveřejnil cenu. Kontaktujte jej pro aktuální nabídku.'}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Zdroj dat</h3>
            <p className="text-sm text-gray-600">
              Informace pochází z OpenStreetMap (Overpass API). Aktuálnost ověřte přímo u ubytovatele.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
