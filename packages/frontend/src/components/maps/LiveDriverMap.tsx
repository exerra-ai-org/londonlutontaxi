import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { getDriverLocation } from "../../api/bookings";

interface Coords {
  lat: number;
  lon: number;
}

const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

function pickupIcon() {
  return L.divIcon({
    html: '<div style="background:#98fe00;width:24px;height:24px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#131313;font-family:Roboto Mono,monospace;font-weight:700;font-size:10px;border:1px solid #131313;box-shadow:0 6px 14px rgba(19,19,19,.16)">P</div>',
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function dropoffIcon() {
  return L.divIcon({
    html: '<div style="background:#131313;width:24px;height:24px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#98fe00;font-family:Roboto Mono,monospace;font-weight:700;font-size:10px;border:1px solid #98fe00;box-shadow:0 6px 14px rgba(19,19,19,.16)">D</div>',
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function driverIcon() {
  return L.divIcon({
    html: '<div style="background:#3b82f6;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;border:2px solid #fff;box-shadow:0 4px 12px rgba(59,130,246,.4)">🚗</div>',
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({
  pickup,
  dropoff,
  driverPos,
}: {
  pickup: Coords;
  dropoff: Coords;
  driverPos: Coords | null;
}) {
  const map = useMap();
  const hasFit = useRef(false);

  useEffect(() => {
    if (hasFit.current) return;
    const points: L.LatLngExpression[] = [
      [pickup.lat, pickup.lon],
      [dropoff.lat, dropoff.lon],
    ];
    if (driverPos) points.push([driverPos.lat, driverPos.lon]);
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
    hasFit.current = true;
  }, [map, pickup, dropoff, driverPos]);

  return null;
}

interface Props {
  bookingId: number;
  pickup: Coords;
  dropoff: Coords;
}

export default function LiveDriverMap({ bookingId, pickup, dropoff }: Props) {
  const [route, setRoute] = useState<L.LatLngExpression[]>([]);
  const [driverPos, setDriverPos] = useState<Coords | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch driving route
  useEffect(() => {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lon},${pickup.lat};${dropoff.lon},${dropoff.lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.routes?.[0]) {
          const coords = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as L.LatLngExpression,
          );
          setRoute(coords);
        }
      })
      .catch(() => {
        setRoute([
          [pickup.lat, pickup.lon],
          [dropoff.lat, dropoff.lon],
        ]);
      });
  }, [pickup.lat, pickup.lon, dropoff.lat, dropoff.lon]);

  // Poll driver location every 10s
  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const loc = await getDriverLocation(bookingId);
        if (!active) return;
        if (loc.lat != null && loc.lon != null) {
          setDriverPos({ lat: loc.lat, lon: loc.lon });
          setLastUpdated(loc.lastUpdatedAt);
        }
      } catch {
        // ignore
      }
    }

    poll();
    const interval = setInterval(poll, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [bookingId]);

  const center: L.LatLngExpression = [
    (pickup.lat + dropoff.lat) / 2,
    (pickup.lon + dropoff.lon) / 2,
  ];

  const timeSince = lastUpdated
    ? Math.round((Date.now() - new Date(lastUpdated).getTime()) / 1000)
    : null;

  return (
    <div className="space-y-2">
      <div className="map-shell h-64 w-full">
        <MapContainer
          center={center}
          zoom={12}
          className="w-full h-full"
          zoomControl={false}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer url={DARK_TILES} />
          <FitBounds pickup={pickup} dropoff={dropoff} driverPos={driverPos} />
          <Marker position={[pickup.lat, pickup.lon]} icon={pickupIcon()} />
          <Marker position={[dropoff.lat, dropoff.lon]} icon={dropoffIcon()} />
          {driverPos && (
            <Marker
              position={[driverPos.lat, driverPos.lon]}
              icon={driverIcon()}
            />
          )}
          {route.length > 0 && (
            <Polyline
              positions={route}
              pathOptions={{ color: "#131313", weight: 4, opacity: 0.8 }}
            />
          )}
        </MapContainer>
      </div>
      {driverPos && timeSince != null && (
        <p className="mono-label text-center text-xs">
          Driver location updated{" "}
          {timeSince < 60
            ? `${timeSince}s ago`
            : `${Math.round(timeSince / 60)}m ago`}
        </p>
      )}
      {!driverPos && (
        <p className="caption-copy text-center text-xs">
          Waiting for driver location...
        </p>
      )}
    </div>
  );
}
