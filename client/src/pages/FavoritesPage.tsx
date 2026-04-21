import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { favoriteApi } from '../api/favoriteApi';
import { FavoriteCombo, SavedSearch } from '../types';
import { formatPrice, formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Heart, Search, Trash2 } from 'lucide-react';

export default function FavoritesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/prihlaseni" />;

  const [favorites, setFavorites] = useState<FavoriteCombo[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'favorites' | 'searches'>('favorites');

  useEffect(() => {
    Promise.all([
      favoriteApi.getFavorites(),
      favoriteApi.getSavedSearches(),
    ]).then(([fav, srch]) => {
      setFavorites(fav.data);
      setSearches(srch.data);
    }).finally(() => setLoading(false));
  }, []);

  const removeFavorite = async (id: number) => {
    try {
      await favoriteApi.removeFavorite(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      toast.success('Odstraněno z oblíbených.');
    } catch {
      toast.error('Chyba při odstraňování.');
    }
  };

  const removeSearch = async (id: number) => {
    try {
      await favoriteApi.removeSavedSearch(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
      toast.success('Hledání odstraněno.');
    } catch {
      toast.error('Chyba při odstraňování.');
    }
  };

  if (loading) return <LoadingSpinner />;

  const favTitle = (fav: FavoriteCombo) => {
    const s = fav.combo_snapshot;
    const outFirst = s?.outbound_route?.segments?.[0];
    const outLast = s?.outbound_route?.segments?.[s?.outbound_route?.segments?.length - 1];
    const origin = outFirst?.originStopName ?? '?';
    const dest = outLast?.destStopName ?? '?';
    return `${origin} → ${dest}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
        <Heart className="text-pink-600" size={28} /> Oblíbené
      </h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('favorites')}
          className={`px-4 py-2 rounded-lg font-medium ${tab === 'favorites' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Kombinace ({favorites.length})
        </button>
        <button
          onClick={() => setTab('searches')}
          className={`px-4 py-2 rounded-lg font-medium ${tab === 'searches' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Uložená hledání ({searches.length})
        </button>
      </div>

      {tab === 'favorites' && (
        <div className="space-y-4">
          {favorites.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Zatím nemáte žádné oblíbené kombinace.</p>
          ) : favorites.map((fav) => (
            <div key={fav.id} className="bg-white rounded-xl shadow p-5 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800">{favTitle(fav)}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {fav.combo_snapshot?.accommodation?.name ?? '—'}
                  {fav.total_score !== null && ` · Skóre: ${Math.round((fav.total_score || 0) * 100)}/100`}
                </div>
                {fav.total_price_czk !== null && (
                  <div className="text-sm font-medium text-blue-600 mt-1">
                    {formatPrice(Number(fav.total_price_czk))}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeFavorite(fav.id)}
                className="text-red-500 hover:text-red-700 p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'searches' && (
        <div className="space-y-4">
          {searches.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Zatím nemáte žádná uložená hledání.</p>
          ) : searches.map((s) => (
            <div key={s.id} className="bg-white rounded-xl shadow p-5 flex items-center justify-between">
              <div
                className="cursor-pointer"
                onClick={() => {
                  const params = new URLSearchParams({
                    origin_name: s.origin_place.name,
                    origin_lat: String(s.origin_place.lat),
                    origin_lon: String(s.origin_place.lon),
                    dest_name: s.dest_place.name,
                    dest_lat: String(s.dest_place.lat),
                    dest_lon: String(s.dest_place.lon),
                    date: s.travel_date ?? '',
                    return_date: s.travel_date ?? '',
                  });
                  navigate(`/vysledky?${params}`);
                }}
              >
                <div className="font-semibold text-gray-800 flex items-center gap-2">
                  <Search size={16} /> {s.origin_place.name} → {s.dest_place.name}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {s.travel_date && formatDate(s.travel_date)} {s.nights ? `· ${s.nights} nocí` : ''}
                </div>
              </div>
              <button
                onClick={() => removeSearch(s.id)}
                className="text-red-500 hover:text-red-700 p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
