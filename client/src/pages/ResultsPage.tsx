import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { recommendationApi } from '../api/recommendationApi';
import { favoriteApi } from '../api/favoriteApi';
import { ScoredCombo, RecommendationWeights, Place } from '../types';
import ComboCard from '../components/results/ComboCard';
import PreferenceSliders from '../components/search/PreferenceSliders';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Search, SlidersHorizontal } from 'lucide-react';

function rescore(combo: ScoredCombo, w: RecommendationWeights): number {
  const s = combo.normalized_scores;
  return w.price * s.price + w.travel_time * s.travel_time + w.comfort * s.comfort + w.rating * s.rating;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMulti = searchParams.get('multi') === '1';

  const origin = useMemo<Place | null>(() => {
    const name = searchParams.get('origin_name');
    const lat = parseFloat(searchParams.get('origin_lat') || '');
    const lon = parseFloat(searchParams.get('origin_lon') || '');
    if (!name || Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { name, lat, lon };
  }, [searchParams]);

  const destination = useMemo<Place | null>(() => {
    if (isMulti) return null;
    const name = searchParams.get('dest_name');
    const lat = parseFloat(searchParams.get('dest_lat') || '');
    const lon = parseFloat(searchParams.get('dest_lon') || '');
    if (!name || Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { name, lat, lon };
  }, [searchParams, isMulti]);

  const date = searchParams.get('date') || '';
  const returnDate = searchParams.get('return_date') || '';

  const nights = Math.max(1, Math.ceil(
    (new Date(returnDate).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  ));

  const [weights, setWeights] = useState<RecommendationWeights>({
    price: user?.pref_price ? Number(user.pref_price) : 0.35,
    travel_time: user?.pref_time ? Number(user.pref_time) : 0.25,
    comfort: user?.pref_comfort ? Number(user.pref_comfort) : 0.25,
    rating: user?.pref_rating ? Number(user.pref_rating) : 0.15,
  });

  // Apply user preferences once they load asynchronously.
  // AuthContext hydrates from localStorage synchronously, so the useState
  // initialiser above may already have user prefs. The functional updater
  // returns the same object reference when values haven't changed, which
  // prevents useDebounced from treating it as a change and firing a spurious fetch.
  const userPrefsApplied = useRef(false);
  useEffect(() => {
    if (!user || userPrefsApplied.current) return;
    userPrefsApplied.current = true;
    setWeights(prev => {
      const next: RecommendationWeights = {
        price:       user.pref_price   ? Number(user.pref_price)   : 0.35,
        travel_time: user.pref_time    ? Number(user.pref_time)    : 0.25,
        comfort:     user.pref_comfort ? Number(user.pref_comfort) : 0.25,
        rating:      user.pref_rating  ? Number(user.pref_rating)  : 0.15,
      };
      const same =
        Math.abs(prev.price        - next.price)        < 0.001 &&
        Math.abs(prev.travel_time  - next.travel_time)  < 0.001 &&
        Math.abs(prev.comfort      - next.comfort)      < 0.001 &&
        Math.abs(prev.rating       - next.rating)       < 0.001;
      return same ? prev : next;
    });
  }, [user]);

  // Debounce weights so single-dest doesn't fire a request on every slider tick
  const debouncedWeights = useDebounced(weights, 600);

  // Single-dest: results fetched from API
  const [fetchedResults, setFetchedResults] = useState<ScoredCombo[]>([]);
  // Multi-dest: raw unfiltered results loaded from sessionStorage once
  const [rawMultiResults, setRawMultiResults] = useState<ScoredCombo[]>([]);

  const [loading, setLoading] = useState(true);
  const [maxTransfers, setMaxTransfers] = useState(2);
  const [visibleCount, setVisibleCount] = useState(10);
  const [multiMeta, setMultiMeta] = useState<{ tagEmoji: string; tagLabel: string } | null>(null);

  // Single-dest: re-fetch when search params, debounced weights or maxTransfers change
  useEffect(() => {
    if (isMulti) return;
    if (!origin || !destination || !date || !returnDate) return;

    let cancelled = false;
    setLoading(true);
    recommendationApi.search({
      origin,
      destination,
      travel_date: date,
      return_date: returnDate,
      nights,
      passengers: 1,
      weights: debouncedWeights,
      filters: { max_transfers: maxTransfers },
    }).then(res => {
      if (!cancelled) {
        setFetchedResults(res.data.results);
        setVisibleCount(10);
      }
    }).catch(() => {
      if (!cancelled) toast.error('Chyba při vyhledávání.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [isMulti, origin?.name, destination?.name, date, returnDate, debouncedWeights, maxTransfers]);

  // Multi-dest: load from sessionStorage once on mount
  useEffect(() => {
    if (!isMulti) return;
    try {
      const stored = sessionStorage.getItem('multiDestResults');
      const meta = sessionStorage.getItem('multiDestMeta');
      if (stored) setRawMultiResults(JSON.parse(stored));
      if (meta) setMultiMeta(JSON.parse(meta));
    } catch {
      toast.error('Chyba při načítání výsledků.');
    } finally {
      setLoading(false);
    }
  }, [isMulti]);

  // Multi-dest: apply transfers filter + re-score client-side whenever weights or maxTransfers change
  const results = useMemo<ScoredCombo[]>(() => {
    if (!isMulti) return fetchedResults;
    return [...rawMultiResults]
      .filter(c =>
        c.outbound_route.transfers <= maxTransfers &&
        c.return_route.transfers <= maxTransfers,
      )
      .map(c => ({ ...c, total_score: Math.round(rescore(c, weights) * 1000) / 1000 }))
      .sort((a, b) => b.total_score - a.total_score);
  }, [isMulti, rawMultiResults, maxTransfers, weights, fetchedResults]);

  const handleDetail = (combo: ScoredCombo) => {
    // For multi-dest, destination is null — derive city from last transit segment
    const fallbackDest = combo.outbound_route.segments
      .filter(s => s.transportType !== 'walk')
      .slice(-1)[0]?.destStopName ?? '';

    const detailState = {
      combo,
      nights,
      originName: origin?.name ?? '',
      destName: destination?.name || fallbackDest,
      date,
      returnDate,
      origin,
      destination,
    };
    sessionStorage.setItem('tripDetail', JSON.stringify(detailState));
    navigate('/detail', { state: detailState });
  };

  const handleSave = async (combo: ScoredCombo) => {
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Search className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-800">
          {isMulti && multiMeta
            ? `${multiMeta.tagEmoji} Nejlepší nabídka — ${multiMeta.tagLabel}`
            : 'Výsledky hledání'}
        </h1>
        <span className="text-gray-500">
          ({results.length} kombinací{isMulti ? ' z více destinací' : ''})
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-4">
          <PreferenceSliders weights={weights} onChange={setWeights} />

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <SlidersHorizontal size={18} /> Filtry
            </h3>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Max. přestupů</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={maxTransfers}
                onChange={(e) => { setMaxTransfers(Number(e.target.value)); setVisibleCount(10); }}
              >
                <option value={0}>Přímé spojení</option>
                <option value={1}>Max. 1 přestup</option>
                <option value={2}>Max. 2 přestupy</option>
              </select>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <LoadingSpinner text="Hledám nejlepší kombinace..." />
          ) : results.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              <p className="text-lg">Nebyly nalezeny žádné kombinace.</p>
              <p className="mt-2">Zkuste změnit parametry hledání nebo zvýšit počet přestupů.</p>
            </div>
          ) : (
            <>
              {results.slice(0, visibleCount).map((combo, i) => (
                <ComboCard
                  key={i}
                  combo={combo}
                  rank={i + 1}
                  onDetail={() => handleDetail(combo)}
                  onSave={() => handleSave(combo)}
                />
              ))}
              {visibleCount < results.length && (
                <button
                  onClick={() => setVisibleCount(v => v + 10)}
                  className="w-full py-3 rounded-xl border-2 border-blue-200 text-blue-600 font-semibold hover:bg-blue-50"
                >
                  Načíst další ({results.length - visibleCount} zbývá)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
