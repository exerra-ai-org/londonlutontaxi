import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";

interface Coords {
  lat: number;
  lon: number;
}

const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const LONDON_CENTER: L.LatLngExpression = [51.5074, -0.1278];

function pickupIcon() {
  return L.divIcon({
    html: '<div style="background:#22c55e;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)">P</div>',
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function dropoffIcon() {
  return L.divIcon({
    html: '<div style="background:#ef4444;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)">D</div>',
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function FitBounds({
  pickupCoords,
  dropoffCoords,
}: {
  pickupCoords?: Coords;
  dropoffCoords?: Coords;
}) {
  const map = useMap();

  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const bounds = L.latLngBounds(
        [pickupCoords.lat, pickupCoords.lon],
        [dropoffCoords.lat, dropoffCoords.lon],
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (pickupCoords) {
      map.setView([pickupCoords.lat, pickupCoords.lon], 13);
    } else if (dropoffCoords) {
      map.setView([dropoffCoords.lat, dropoffCoords.lon], 13);
    }
  }, [
    map,
    pickupCoords?.lat,
    pickupCoords?.lon,
    dropoffCoords?.lat,
    dropoffCoords?.lon,
  ]);

  return null;
}

interface MapPickerProps {
  pickupCoords?: Coords;
  dropoffCoords?: Coords;
  onPickupChange: (coords: Coords) => void;
  onDropoffChange: (coords: Coords) => void;
}

export default function MapPicker({
  pickupCoords,
  dropoffCoords,
  onPickupChange,
  onDropoffChange,
}: MapPickerProps) {
  const center: L.LatLngExpression = pickupCoords
    ? [pickupCoords.lat, pickupCoords.lon]
    : dropoffCoords
      ? [dropoffCoords.lat, dropoffCoords.lon]
      : LONDON_CENTER;

  return (
    <div className="w-full h-56 rounded-xl overflow-hidden border border-gray-800">
      <MapContainer
        center={center}
        zoom={11}
        className="w-full h-full"
        zoomControl
        attributionControl={false}
      >
        <TileLayer url={DARK_TILES} attribution={TILE_ATTR} />
        <FitBounds pickupCoords={pickupCoords} dropoffCoords={dropoffCoords} />
        {pickupCoords && (
          <Marker
            position={[pickupCoords.lat, pickupCoords.lon]}
            icon={pickupIcon()}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const latlng = e.target.getLatLng();
                onPickupChange({ lat: latlng.lat, lon: latlng.lng });
              },
            }}
          />
        )}
        {dropoffCoords && (
          <Marker
            position={[dropoffCoords.lat, dropoffCoords.lon]}
            icon={dropoffIcon()}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const latlng = e.target.getLatLng();
                onDropoffChange({ lat: latlng.lat, lon: latlng.lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
