import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteSegment, TransportType } from '../../types';

const CDN = 'https://unpkg.com/leaflet@1.9.4/dist/images';

const greenIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: `${CDN}/marker-shadow.png`,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const redIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: `${CDN}/marker-shadow.png`,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = greenIcon;

// Keep for potential external usage (backward compat types)
export type MapTransportType = TransportType;
export interface MapRouteSegment {
  type: MapTransportType;
  from: [number, number];
  to: [number, number];
}
export interface MapRouteCity {
  name: string;
  lat: number;
  lon: number;
  isOrigin?: boolean;
  isDest?: boolean;
}

const COLORS: Record<TransportType, string> = {
  train: '#2563eb',
  bus:   '#16a34a',
  tram:  '#dc2626',
  metro: '#9333ea',
  walk:  '#9ca3af',
};

const TRANSPORT_LABEL: Record<TransportType, string> = {
  train: '🚂 Vlak',
  bus:   '🚌 Autobus',
  tram:  '🚋 Tramvaj',
  metro: '🚇 Metro',
  walk:  '🚶 Pěšky',
};

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

interface MapRouteProps {
  segments: RouteSegment[];
  height?: string;
}

export default function MapRoute({ segments, height = '320px' }: MapRouteProps) {
  if (!segments || segments.length === 0) return null;

  // Collect all lat/lon points for FitBounds — guard against undefined/NaN
  const allPoints: [number, number][] = [];
  segments.forEach(seg => {
    const oLat = Number(seg.originLat), oLon = Number(seg.originLon);
    const dLat = Number(seg.destLat),   dLon = Number(seg.destLon);
    if (isFinite(oLat) && isFinite(oLon)) allPoints.push([oLat, oLon]);
    if (isFinite(dLat) && isFinite(dLon)) allPoints.push([dLat, dLon]);
  });
  if (allPoints.length === 0) return null;

  const center: [number, number] = [49.8, 15.5];

  return (
    <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={allPoints} />

        {segments.map((seg, i) => {
          const fromLat = Number(seg.originLat), fromLon = Number(seg.originLon);
          const toLat   = Number(seg.destLat),   toLon   = Number(seg.destLon);
          if (!isFinite(fromLat) || !isFinite(fromLon) || !isFinite(toLat) || !isFinite(toLon)) return null;
          const from: [number, number] = [fromLat, fromLon];
          const to: [number, number]   = [toLat, toLon];
          const color = COLORS[seg.transportType] ?? '#2563eb';
          const isWalk = seg.transportType === 'walk';
          const polyPoints: [number, number][] = (() => {
            if (seg.geometry && seg.geometry.length > 1) {
              const [firstLat] = seg.geometry[0];
              // Guard against old wrong-scale geometry (decoded with 1e-5 instead of 1e-6)
              if (Math.abs(firstLat) <= 90) return seg.geometry;
            }
            return [from, to];
          })();

          return (
            <Polyline
              key={`seg-${i}`}
              positions={polyPoints}
              color={color}
              weight={isWalk ? 3 : 5}
              opacity={isWalk ? 0.6 : 0.85}
              dashArray={isWalk ? '6 8' : undefined}
            />
          );
        })}

        {/* Stop markers at each segment origin */}
        {segments.map((seg, i) => {
          const fromLat = Number(seg.originLat), fromLon = Number(seg.originLon);
          if (!isFinite(fromLat) || !isFinite(fromLon)) return null;
          const isFirst = i === 0;
          const from: [number, number] = [fromLat, fromLon];
          const color = COLORS[seg.transportType] ?? '#2563eb';

          if (isFirst) {
            return (
              <Marker key={`origin-${i}`} position={from} icon={greenIcon}>
                <Popup>
                  <strong>{seg.originStopName || 'Výchozí bod'}</strong>
                  <br /><span style={{ color: '#16a34a' }}>Odjezd {seg.departureTime}</span>
                </Popup>
              </Marker>
            );
          }
          return (
            <CircleMarker
              key={`stop-${i}`}
              center={from}
              radius={6}
              fillColor={color}
              color="#fff"
              weight={2}
              fillOpacity={1}
            >
              <Popup>
                <strong>{seg.originStopName || 'Přestup'}</strong>
                <br />{TRANSPORT_LABEL[seg.transportType]}
                <br /><span style={{ color: '#6b7280' }}>Odjezd {seg.departureTime}</span>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Final destination marker */}
        {(() => {
          const last = segments[segments.length - 1];
          const dLat = Number(last?.destLat), dLon = Number(last?.destLon);
          if (!isFinite(dLat) || !isFinite(dLon)) return null;
          return (
            <Marker position={[dLat, dLon]} icon={redIcon}>
              <Popup>
                <strong>{last?.destStopName || 'Cíl'}</strong>
                <br /><span style={{ color: '#dc2626' }}>Příjezd {last?.arrivalTime}</span>
              </Popup>
            </Marker>
          );
        })()}
      </MapContainer>
    </div>
  );
}
