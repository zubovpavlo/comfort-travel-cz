import { useState, useEffect, useRef } from 'react';
import { RecommendationWeights } from '../../types';

interface Props {
  weights: RecommendationWeights;
  onChange: (weights: RecommendationWeights) => void;
}

const labels: Record<keyof RecommendationWeights, string> = {
  price: 'Cena',
  travel_time: 'Doba cesty',
  comfort: 'Komfort',
  rating: 'Hodnocení',
};

const colors: Record<keyof RecommendationWeights, string> = {
  price: 'accent-green-600',
  travel_time: 'accent-blue-600',
  comfort: 'accent-purple-600',
  rating: 'accent-yellow-500',
};

type RawWeights = Record<keyof RecommendationWeights, number>;

function normalize(raw: RawWeights): RecommendationWeights {
  const sum = raw.price + raw.travel_time + raw.comfort + raw.rating;
  if (sum === 0) return { price: 0.25, travel_time: 0.25, comfort: 0.25, rating: 0.25 };
  return {
    price: raw.price / sum,
    travel_time: raw.travel_time / sum,
    comfort: raw.comfort / sum,
    rating: raw.rating / sum,
  };
}

function weightsToRaw(w: RecommendationWeights): RawWeights {
  return {
    price: Math.round(w.price * 100),
    travel_time: Math.round(w.travel_time * 100),
    comfort: Math.round(w.comfort * 100),
    rating: Math.round(w.rating * 100),
  };
}

export default function PreferenceSliders({ weights, onChange }: Props) {
  const [raw, setRaw] = useState<RawWeights>(() => weightsToRaw(weights));
  // rawRef mirrors raw state so the effect below can read it without adding it as a dep
  const rawRef = useRef(raw);
  rawRef.current = raw;

  // Sync raw only when weights change from an external source (e.g. user profile load).
  // If normalize(raw) ≈ weights, the change came from our own onChange — skip to
  // avoid the slider snapping back to rounded values after every interaction.
  useEffect(() => {
    const cur = normalize(rawRef.current);
    const isOwn =
      Math.abs(cur.price        - weights.price)        < 0.001 &&
      Math.abs(cur.travel_time  - weights.travel_time)  < 0.001 &&
      Math.abs(cur.comfort      - weights.comfort)      < 0.001 &&
      Math.abs(cur.rating       - weights.rating)       < 0.001;
    if (!isOwn) setRaw(weightsToRaw(weights));
  }, [weights.price, weights.travel_time, weights.comfort, weights.rating]);

  const handleChange = (key: keyof RecommendationWeights, val: number) => {
    const newRaw = { ...raw, [key]: val };
    setRaw(newRaw);
    onChange(normalize(newRaw));
  };

  const keys = Object.keys(labels) as (keyof RecommendationWeights)[];
  // Compute normalized weights for display so the shown percentage matches
  // what's actually sent to the backend (weights always sum to 100%).
  const displayWeights = normalize(raw);

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-gray-800 mb-3">Preference</h3>
      <div className="space-y-3">
        {keys.map((key) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{labels[key]}</span>
              <span className="font-medium">{Math.round(displayWeights[key] * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={raw[key]}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className={`w-full h-2 rounded-lg cursor-pointer ${colors[key]}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
