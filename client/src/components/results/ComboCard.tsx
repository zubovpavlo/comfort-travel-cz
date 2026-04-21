import { ScoredCombo } from '../../types';
import { formatPrice, formatDuration, formatTime } from '../../utils/formatters';
import ScoreBreakdown from './ScoreBreakdown';
import { Train, Bus, Hotel, Heart, ChevronRight, TramFront, Footprints } from 'lucide-react';
import { TransportType } from '../../types';

interface Props {
  combo: ScoredCombo;
  rank: number;
  onSave?: () => void;
  onDetail?: () => void;
}

function iconForTransport(type: TransportType) {
  switch (type) {
    case 'train':
      return <Train size={16} />;
    case 'tram':
    case 'metro':
      return <TramFront size={16} />;
    case 'walk':
      return <Footprints size={16} />;
    case 'bus':
    default:
      return <Bus size={16} />;
  }
}

function RouteDisplay({ route, label }: { route: ScoredCombo['outbound_route']; label: string }) {
  const first = route.segments[0];
  const last = route.segments[route.segments.length - 1];
  const icon = iconForTransport(first.transportType);

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-400 w-12">{label}</span>
      <span className="text-blue-600">{icon}</span>
      <span className="font-medium">{formatTime(first.departureTime)}</span>
      <span className="text-gray-400">→</span>
      <span className="font-medium">{formatTime(last.arrivalTime)}</span>
      <span className="text-gray-500">
        {formatDuration(route.totalDurationMinutes)}
        {route.transfers > 0 && ` · ${route.transfers} přestup${route.transfers > 1 ? 'y' : ''}`}
      </span>
      <span className="ml-auto font-medium text-gray-700">{formatPrice(route.totalPriceCzk)}</span>
    </div>
  );
}

export default function ComboCard({ combo, rank, onSave, onDetail }: Props) {
  const scorePercent = Math.round(combo.total_score * 100);

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="bg-blue-100 text-blue-700 font-bold text-lg w-10 h-10 rounded-full flex items-center justify-center">
            {rank}
          </span>
          <div>
            <span className="text-2xl font-bold text-blue-700">{scorePercent}</span>
            <span className="text-sm text-gray-500 ml-1">/ 100</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-800">{formatPrice(combo.total_price_czk)}</div>
          <div className="text-sm text-gray-500">celkem</div>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <RouteDisplay route={combo.outbound_route} label="Tam" />
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400 w-12">Pobyt</span>
          <Hotel size={16} className="text-purple-600" />
          <span className="font-medium">{combo.accommodation.name}</span>
          {(() => {
            const city = combo.accommodation.city_name
              || combo.outbound_route.segments
                  .filter(s => s.transportType !== 'walk')
                  .slice(-1)[0]?.destStopName
              || null;
            return city ? <span className="text-gray-400 text-xs">{city}</span> : null;
          })()}
          <span className="text-gray-500">
            {combo.accommodation.star_rating ? `${combo.accommodation.star_rating}★ · ` : ''}
            {combo.accommodation.price_per_night !== null
              ? `${formatPrice(Number(combo.accommodation.price_per_night))}/noc`
              : 'cena na vyžádání'}
          </span>
        </div>
        <RouteDisplay route={combo.return_route} label="Zpět" />
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1">
          <ScoreBreakdown scores={combo.normalized_scores} />
        </div>
        <div className="flex flex-col gap-2">
          {onDetail && (
            <button
              onClick={onDetail}
              className="flex items-center gap-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 font-medium"
            >
              Detail <ChevronRight size={16} />
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700 border border-pink-200 rounded-lg px-3 py-1.5 hover:bg-pink-50"
            >
              <Heart size={16} /> Uložit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
