import { useState, useEffect, useRef } from 'react';
import { Place } from '../../types';
import { geoApi } from '../../api/geoApi';
import { MapPin, X, Loader2 } from 'lucide-react';

interface Props {
  label: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
}

export default function CityAutocomplete({ label, value, onChange }: Props) {
  const [results, setResults] = useState<Place[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (value) setInputValue(value.name);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchSuggestions = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    const id = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    geoApi
      .geocode(trimmed)
      .then((res) => {
        if (id !== requestIdRef.current) return;
        setResults(res.data.places || []);
        setLoading(false);
      })
      .catch(() => {
        if (id !== requestIdRef.current) return;
        setResults([]);
        setLoading(false);
        setError('Nepodařilo se načíst nabídku');
      });
  };

  const handleFocus = () => setOpen(true);

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 150);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setInputValue(next);
    setOpen(true);
    if (!next) {
      onChange(null);
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(next), 300);
  };

  const handleSelect = (place: Place) => {
    onChange(place);
    setInputValue(place.name);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange(null);
    setInputValue('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const placeKey = (p: Place, idx: number) => p.id || `${p.lat},${p.lon},${idx}`;

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" size={18} />
        <input
          ref={inputRef}
          type="text"
          className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          placeholder="Zadejte město nebo zastávku..."
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-8 top-2.5 text-gray-400 animate-spin" size={16} />
        )}
        {inputValue && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleClear();
            }}
            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-auto text-gray-900">
          {results.map((place, idx) => (
            <li
              key={placeKey(place, idx)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(place);
              }}
              className="px-4 py-2.5 cursor-pointer flex items-center justify-between hover:bg-blue-50 text-gray-900"
            >
              <span className="font-medium">{place.name}</span>
              {place.region && (
                <span className="text-sm text-gray-400">{place.region}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && !loading && inputValue.trim().length >= 2 && results.length === 0 && !error && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl px-4 py-3 text-sm text-gray-400">
          Žádné výsledky
        </div>
      )}

      {open && error && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}
