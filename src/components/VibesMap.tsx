import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapProps {
  spots: any[];
}

export default function VibesMap({ spots }: MapProps) {
  // Center roughly on Dubai, UAE
  const center: [number, number] = [25.2048, 55.2708];

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-lg border border-white/20 relative z-0">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {spots.map((spot) => {
          return (
            <Marker key={spot.id} position={[spot.lat, spot.lng]}>
              <Popup>
                <div className="font-bold">{spot.name}</div>
                <div className="text-xs text-gray-500">{spot.type}</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
