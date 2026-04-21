import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CityAutocomplete from '../components/search/CityAutocomplete';
import { Place, ScoredCombo, FuelType, FuelPrices } from '../types';
import { recommendationApi } from '../api/recommendationApi';
import api from '../api/axiosInstance';
import toast from 'react-hot-toast';
import { Train, Hotel, Star, ArrowRight, Shuffle, X, Loader2, Sparkles, Car } from 'lucide-react';

const FUEL_LABELS: Record<FuelType, string> = {
  benzin: 'Benzín 95',
  diesel: 'Nafta',
  lpg: 'LPG',
};

const FUEL_DEFAULT_CONSUMPTION: Record<FuelType, number> = {
  benzin: 7.5,
  diesel: 6.5,
  lpg: 10.0,
};

interface DestTag {
  id: string;
  emoji: string;
  label: string;
  places: Place[];
}

const DEST_TAGS: DestTag[] = [
  {
    id: 'hory', emoji: '⛰️', label: 'Hory',
    places: [
      { name: 'Špindlerův Mlýn', lat: 50.7233, lon: 15.6116 },
      { name: 'Pec pod Sněžkou', lat: 50.6927, lon: 15.7356 },
      { name: 'Harrachov', lat: 50.7734, lon: 15.4325 },
      { name: 'Nové Město na Moravě', lat: 49.5661, lon: 16.0741 },
      { name: 'Rožnov pod Radhoštěm', lat: 49.4591, lon: 18.1424 },
    ],
  },
  {
    id: 'priroda', emoji: '🌿', label: 'Příroda',
    places: [
      { name: 'Český Krumlov', lat: 48.8127, lon: 14.3175 },
      { name: 'Šumava', lat: 49.1261, lon: 13.5739 },
      { name: 'České Švýcarsko', lat: 50.8741, lon: 14.2357 },
      { name: 'Třeboň', lat: 49.0030, lon: 14.7751 },
      { name: 'Moravský kras', lat: 49.3581, lon: 16.6473 },
    ],
  },
  {
    id: 'historicke', emoji: '🏰', label: 'Historická místa',
    places: [
      { name: 'Praha', lat: 50.0875, lon: 14.4213 },
      { name: 'Olomouc', lat: 49.5935, lon: 17.2516 },
      { name: 'Kutná Hora', lat: 49.9450, lon: 15.2676 },
      { name: 'Telč', lat: 49.1838, lon: 15.4517 },
      { name: 'Kroměříž', lat: 49.2977, lon: 17.3940 },
    ],
  },
  {
    id: 'lazne', emoji: '♨️', label: 'Lázně & Wellness',
    places: [
      { name: 'Karlovy Vary', lat: 50.2293, lon: 12.8716 },
      { name: 'Mariánské Lázně', lat: 49.9637, lon: 12.7012 },
      { name: 'Luhačovice', lat: 49.0998, lon: 17.7421 },
      { name: 'Poděbrady', lat: 50.1427, lon: 15.1189 },
    ],
  },
  {
    id: 'kultura', emoji: '🎭', label: 'Kultura & Město',
    places: [
      { name: 'Brno', lat: 49.1951, lon: 16.6068 },
      { name: 'Ostrava', lat: 49.8209, lon: 18.2625 },
      { name: 'Plzeň', lat: 49.7384, lon: 13.3736 },
      { name: 'Liberec', lat: 50.7663, lon: 15.0543 },
      { name: 'Pardubice', lat: 50.0343, lon: 15.7812 },
    ],
  },
  {
    id: 'vino', emoji: '🍷', label: 'Víno & Gastronomie',
    places: [
      { name: 'Mikulov', lat: 48.8066, lon: 16.6376 },
      { name: 'Znojmo', lat: 48.8558, lon: 16.0448 },
      { name: 'Uherské Hradiště', lat: 49.0682, lon: 17.4607 },
      { name: 'Lednice', lat: 48.8031, lon: 16.8038 },
    ],
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [anywhereMode, setAnywhereMode] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [bestDealLoading, setBestDealLoading] = useState(false);
  const [bestDealProgress, setBestDealProgress] = useState(0);

  // Transport mode (public transit vs car)
  const [transportMode, setTransportMode] = useState<'transit' | 'car'>('transit');
  const [fuelType, setFuelType] = useState<FuelType>('benzin');
  const [consumption, setConsumption] = useState<number>(FUEL_DEFAULT_CONSUMPTION.benzin);
  const [fuelPrice, setFuelPrice] = useState<string>('');
  const [fuelSource, setFuelSource] = useState<string>('');

  useEffect(() => {
    if (transportMode !== 'car') return;
    let cancelled = false;
    api.get<FuelPrices>('/fuel/price').then(r => {
      if (cancelled) return;
      setFuelPrice(r.data[fuelType].toFixed(2));
      setFuelSource(`${r.data.source} · ${r.data.updated}`);
    }).catch(() => {
      if (!cancelled) setFuelSource('Ceny paliv nelze načíst — zadejte ručně');
    });
    return () => { cancelled = true; };
  }, [transportMode, fuelType]);

  const handleFuelTypeChange = (t: FuelType) => {
    setFuelType(t);
    setConsumption(FUEL_DEFAULT_CONSUMPTION[t]);
    setFuelPrice('');
  };

  const nights = date && returnDate
    ? Math.max(1, Math.ceil((new Date(returnDate).getTime() - new Date(date).getTime()) / 86400000))
    : 1;

  const activeTagData = DEST_TAGS.find(t => t.id === activeTag);
  const canSearch = !!origin && !!dest && !!date && !!returnDate;
  const canBestDeal = !!origin && !!activeTag && !!date && !!returnDate;

  const handleSearch = () => {
    if (!canSearch) return;
    const params = new URLSearchParams({
      origin_name: origin!.name,
      origin_lat: origin!.lat.toString(),
      origin_lon: origin!.lon.toString(),
      dest_name: dest!.name,
      dest_lat: dest!.lat.toString(),
      dest_lon: dest!.lon.toString(),
      date,
      return_date: returnDate,
    });
    if (transportMode === 'car') {
      params.set('transport_mode', 'car');
      params.set('fuel_type', fuelType);
      params.set('consumption', String(consumption));
      if (fuelPrice) params.set('fuel_price', fuelPrice);
    }
    navigate(`/vysledky?${params}`);
  };

  const handleBestDeal = async () => {
    if (!canBestDeal || !activeTagData) return;
    setBestDealLoading(true);
    setBestDealProgress(0);

    try {
      const destinations = activeTagData.places;
      let done = 0;
      const results = await Promise.allSettled(
        destinations.map(destination =>
          recommendationApi.search({
            origin: origin!,
            destination,
            travel_date: date,
            return_date: returnDate,
            nights,
            passengers: 1,
            weights: { price: 0.35, travel_time: 0.25, comfort: 0.25, rating: 0.15 },
            filters: {},
          }).then(r => { setBestDealProgress(Math.round((++done / destinations.length) * 100)); return r; })
        )
      );

      const allCombos: ScoredCombo[] = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => (r as PromiseFulfilledResult<{ data: { results: ScoredCombo[] } }>).value.data.results ?? []);

      // Each destination's normalized_scores are computed relative to that
      // destination's own result set, so a 3 000 CZK Kutná Hora combo can have
      // a lower normPrice than a 15 000 CZK Praha combo. Re-normalize globally
      // using absolute values so cross-destination price comparisons are correct.
      if (allCombos.length > 1) {
        const globalMinMax = (vals: number[], invert: boolean) => {
          const min = Math.min(...vals);
          const max = Math.max(...vals);
          if (max === min) return vals.map(() => 1.0);
          return vals.map(v => { const n = (v - min) / (max - min); return invert ? 1 - n : n; });
        };

        const nPrice   = globalMinMax(allCombos.map(c => c.total_price_czk),       true);
        const nTime    = globalMinMax(allCombos.map(c => c.total_travel_minutes),   true);
        const nComfort = globalMinMax(allCombos.map(c => c.comfort_score),          false);
        const nRating  = globalMinMax(allCombos.map(c => c.accommodation_rating),   false);
        const W = { price: 0.35, travel_time: 0.25, comfort: 0.25, rating: 0.15 };

        allCombos.forEach((c, i) => {
          c.normalized_scores = {
            price:       Math.round(nPrice[i]   * 1000) / 1000,
            travel_time: Math.round(nTime[i]    * 1000) / 1000,
            comfort:     Math.round(nComfort[i] * 1000) / 1000,
            rating:      Math.round(nRating[i]  * 1000) / 1000,
          };
          c.total_score = Math.round((
            W.price * nPrice[i] + W.travel_time * nTime[i] +
            W.comfort * nComfort[i] + W.rating * nRating[i]
          ) * 1000) / 1000;
        });
      }

      allCombos.sort((a, b) => b.total_score - a.total_score);

      if (allCombos.length === 0) {
        toast.error('Pro tuto kategorii nebyly nalezeny žádné výsledky. Zkuste jiné téma nebo datum.');
        return;
      }

      sessionStorage.setItem('multiDestResults', JSON.stringify(allCombos.slice(0, 50)));
      sessionStorage.setItem('multiDestMeta', JSON.stringify({
        tagLabel: activeTagData.label,
        tagEmoji: activeTagData.emoji,
        originName: origin!.name,
        date,
        returnDate,
        nights,
      }));

      navigate(`/vysledky?multi=1&origin_name=${encodeURIComponent(origin!.name)}&origin_lat=${origin!.lat}&origin_lon=${origin!.lon}&date=${date}&return_date=${returnDate}`);
    } catch {
      toast.error('Chyba při hledání.');
    } finally {
      setBestDealLoading(false);
      setBestDealProgress(0);
    }
  };

  const handleTagSelect = (tagId: string) => {
    const next = tagId === activeTag ? null : tagId;
    setActiveTag(next);
    setDest(null);
  };

  const handleSelectDest = (place: Place) => {
    setDest(place);
    setAnywhereMode(false);
  };

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Hero + Search */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Najděte ideální kombinaci dopravy a ubytování
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Porovnejte vlaky, autobusy a ubytování po celé ČR na jednom místě
          </p>

          <div className="bg-white rounded-2xl shadow-2xl p-6 text-left">
            {/* Row 1: Odkud + Kam */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <CityAutocomplete label="Odkud" value={origin} onChange={setOrigin} />

              {anywhereMode ? (
                /* Anywhere mode */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Kam — vyberte téma</span>
                    <button
                      onClick={() => { setAnywhereMode(false); setActiveTag(null); setDest(null); }}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      <X size={12} /> Zadat ručně
                    </button>
                  </div>
                  {/* Tag chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {DEST_TAGS.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagSelect(tag.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          activeTag === tag.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {tag.emoji} {tag.label}
                      </button>
                    ))}
                  </div>

                  {/* Destination list for active tag */}
                  {activeTagData && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {activeTagData.places.map((place, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectDest(place)}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between border-b border-gray-100 last:border-0 transition-colors ${
                            dest?.name === place.name ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          <span>{place.name}</span>
                          {dest?.name === place.name && <span className="text-blue-500 text-xs">✓ Vybráno</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Normal autocomplete */
                <div>
                  <CityAutocomplete label="Kam" value={dest} onChange={setDest} />
                  <button
                    onClick={() => { setAnywhereMode(true); setDest(null); }}
                    className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Shuffle size={12} /> Nevím kam — poradit mi
                  </button>
                </div>
              )}
            </div>

            {/* Row 2: Dates */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum odjezdu</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum návratu</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>
            </div>

            {/* Transport mode toggle */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Jak cestujete?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransportMode('transit')}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-colors ${
                    transportMode === 'transit'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Train size={16} /> Veřejná doprava
                </button>
                <button
                  type="button"
                  onClick={() => setTransportMode('car')}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-colors ${
                    transportMode === 'car'
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Car size={16} /> Autem
                </button>
              </div>

              {transportMode === 'car' && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Druh paliva</label>
                    <div className="flex gap-1.5">
                      {(['benzin', 'diesel', 'lpg'] as FuelType[]).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleFuelTypeChange(t)}
                          className={`flex-1 px-2 py-1 text-xs rounded border font-medium ${
                            fuelType === t
                              ? 'border-green-600 bg-white text-green-700'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          {FUEL_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Spotřeba (l/100km)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="25"
                        value={consumption}
                        onChange={(e) => setConsumption(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cena paliva (Kč/l)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="Načítám..."
                        value={fuelPrice}
                        onChange={(e) => setFuelPrice(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  {fuelSource && (
                    <div className="text-xs text-gray-500">⛽ {fuelSource}</div>
                  )}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSearch}
                disabled={!canSearch}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                Vyhledat kombinace <ArrowRight size={18} />
              </button>

              {anywhereMode && activeTag && (
                <button
                  onClick={handleBestDeal}
                  disabled={!canBestDeal || bestDealLoading}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-semibold text-base hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {bestDealLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Hledám… {bestDealProgress > 0 ? `${bestDealProgress}%` : ''}
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Nejlepší nabídka
                    </>
                  )}
                </button>
              )}
            </div>

            {bestDealLoading && (
              <div className="mt-3">
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${bestDealProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Prohledávám {activeTagData?.places.length} destinací v kategorii {activeTagData?.emoji} {activeTagData?.label}…
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Train className="text-blue-600" size={32} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Reálná doprava</h3>
            <p className="text-gray-600">Vlaky, autobusy, tramvaje a metro z živých dat Transitous / MOTIS.</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Hotel className="text-purple-600" size={32} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ubytování z OSM</h3>
            <p className="text-gray-600">Hotely, penziony, hostely a apartmány z OpenStreetMap (Overpass API).</p>
          </div>
          <div className="text-center">
            <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Star className="text-yellow-600" size={32} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Chytré doporučení</h3>
            <p className="text-gray-600">Algoritmus vyhodnotí cenu, čas, komfort a hodnocení podle vašich preferencí.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
