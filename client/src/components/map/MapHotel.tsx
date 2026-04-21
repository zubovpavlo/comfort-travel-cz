import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapHotelProps {
  name: string;
  lat: number;
  lon: number;
  pricePerNight?: number;
  height?: string;
}

export default function MapHotel({ name, lat, lon, pricePerNight, height = '280px' }: MapHotelProps) {
  return (
    <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer center={[lat, lon]} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]}>
          <Popup>
            <strong>{name}</strong>
            {pricePerNight !== undefined && (
              <>
                <br />
                <span>{pricePerNight.toLocaleString('cs-CZ')} Kč / noc</span>
              </>
            )}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
