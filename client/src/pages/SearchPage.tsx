import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CityAutocomplete from '../components/search/CityAutocomplete';
import { Place, FuelType, FuelPrices } from '../types';
import api from '../api/axiosInstance';
import { ArrowRight, Shuffle, X, Train, Car } from 'lucide-react';

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
  places: Omit<Place, 'id'>[];
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

export default function SearchPage() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [anywhereMode, setAnywhereMode] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Transport mode: transit (public) vs car
  const [transportMode, setTransportMode] = useState<'transit' | 'car'>('transit');
  const [fuelType, setFuelType] = useState<FuelType>('benzin');
  const [consumption, setConsumption] = useState<number>(FUEL_DEFAULT_CONSUMPTION.benzin);
  const [fuelPrice, setFuelPrice] = useState<string>('');
  const [fuelSource, setFuelSource] = useState<string>('');

  // Fetch live fuel prices when user switches fuel type (or opens car mode)
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

  const handleSearch = () => {
    if (!origin || !dest || !date || !returnDate) return;
    const params = new URLSearchParams({
      origin_name: origin.name,
      origin_lat: origin.lat.toString(),
      origin_lon: origin.lon.toString(),
      dest_name: dest.name,
      dest_lat: dest.lat.toString(),
      dest_lon: dest.lon.toString(),
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

  const handleTagSelect = (tagId: string) => {
    setActiveTag(tagId === activeTag ? null : tagId);
  };

  const handleSuggestedDest = (place: Omit<Place, 'id'>) => {
    setDest(place as Place);
    setAnywhereMode(false);
    setActiveTag(null);
  };

  const suggestedPlaces = activeTag
    ? DEST_TAGS.find(t => t.id === activeTag)?.places ?? []
    : [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Vyhledat spojení</h1>

      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CityAutocomplete label="Odkud" value={origin} onChange={setOrigin} />

          {anywhereMode ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Kam — vyberte téma</label>
                <button
                  onClick={() => { setAnywhereMode(false); setActiveTag(null); }}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <X size={12} /> Zadat ručně
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEST_TAGS.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagSelect(tag.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      activeTag === tag.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {tag.emoji} {tag.label}
                  </button>
                ))}
              </div>

              {suggestedPlaces.length > 0 && (
                <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                  {suggestedPlaces.map((place, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedDest(place)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center justify-between border-b border-gray-100 last:border-0"
                    >
                      <span className="font-medium text-gray-800">{place.name}</span>
                      <ArrowRight size={14} className="text-blue-400" />
                    </button>
                  ))}
                </div>
              )}

              {dest && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-700 font-medium">
                  ✓ Vybráno: {dest.name}
                </div>
              )}
            </div>
          ) : (
            <div>
              <CityAutocomplete label="Kam" value={dest} onChange={setDest} />
              <button
                onClick={() => { setAnywhereMode(true); setDest(null); }}
                className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <Shuffle size={13} /> Nevím kam — poradit mi
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum odjezdu</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum návratu</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Jak cestujete?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTransportMode('transit')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                transportMode === 'transit'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <Train size={18} /> Veřejná doprava
            </button>
            <button
              type="button"
              onClick={() => setTransportMode('car')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                transportMode === 'car'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <Car size={18} /> Autem
            </button>
          </div>

          {transportMode === 'car' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Druh paliva</label>
                <div className="flex gap-2">
                  {(['benzin', 'diesel', 'lpg'] as FuelType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleFuelTypeChange(t)}
                      className={`px-3 py-1.5 text-sm rounded-lg border font-medium ${
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Spotřeba (l/100km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="25"
                    value={consumption}
                    onChange={(e) => setConsumption(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {fuelSource && (
                <div className="text-xs text-gray-500">⛽ {fuelSource}</div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleSearch}
          disabled={!origin || !dest || !date || !returnDate}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Vyhledat <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
