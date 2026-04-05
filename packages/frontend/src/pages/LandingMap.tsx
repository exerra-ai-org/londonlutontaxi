import { useState, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { BookingData } from "./BookingFlow";
import AddressAutocomplete from "../components/maps/AddressAutocomplete";
import { IconMapPin } from "../components/icons";

const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const UK_CENTER: L.LatLngExpression = [54.5, -2.5];
const UK_ZOOM = 6;

interface Props {
  data: Partial<BookingData>;
  onNext: (fields: Partial<BookingData>) => void;
}

interface Coords {
  lat: number;
  lon: number;
}

function pickupIcon() {
  return L.divIcon({
    html: '<div style="background:#22c55e;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.5)">P</div>',
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function dropoffIcon() {
  return L.divIcon({
    html: '<div style="background:#ef4444;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.5)">D</div>',
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function MapController({
  pickupCoords,
  dropoffCoords,
  activeField,
  onMapClick,
}: {
  pickupCoords: Coords | null;
  dropoffCoords: Coords | null;
  activeField: "pickup" | "dropoff" | null;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  // Auto-fit bounds when both markers placed
  useEffect(() => {
    if (!pickupCoords || !dropoffCoords) return;
    const bounds = L.latLngBounds(
      [pickupCoords.lat, pickupCoords.lon],
      [dropoffCoords.lat, dropoffCoords.lon],
    );
    map.fitBounds(bounds, {
      padding: [60, 60],
      paddingBottomRight: [40, 200],
    });
  }, [
    map,
    pickupCoords?.lat,
    pickupCoords?.lon,
    dropoffCoords?.lat,
    dropoffCoords?.lon,
  ]);

  // Cursor style for active pick mode
  useEffect(() => {
    if (activeField) {
      map.getContainer().style.cursor = "crosshair";
    } else {
      map.getContainer().style.cursor = "";
    }
    return () => {
      map.getContainer().style.cursor = "";
    };
  }, [map, activeField]);

  // Map click via react-leaflet hook
  useMapEvents({
    click(e) {
      if (activeField) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
}

export default function LandingMap({ data, onNext }: Props) {
  const [pickup, setPickup] = useState(data.pickupAddress || "");
  const [pickupLat, setPickupLat] = useState<number | undefined>(
    data.pickupLat,
  );
  const [pickupLon, setPickupLon] = useState<number | undefined>(
    data.pickupLon,
  );
  const [dropoff, setDropoff] = useState(data.dropoffAddress || "");
  const [dropoffLat, setDropoffLat] = useState<number | undefined>(
    data.dropoffLat,
  );
  const [dropoffLon, setDropoffLon] = useState<number | undefined>(
    data.dropoffLon,
  );
  const [date, setDate] = useState(data.date || "");
  const [time, setTime] = useState(data.time || "");
  const [activeField, setActiveField] = useState<"pickup" | "dropoff" | null>(
    null,
  );
  const [route, setRoute] = useState<L.LatLngExpression[]>([]);

  // Fetch route when both coords set
  useEffect(() => {
    if (
      pickupLat == null ||
      pickupLon == null ||
      dropoffLat == null ||
      dropoffLon == null
    ) {
      setRoute([]);
      return;
    }
    const url = `https://router.project-osrm.org/route/v1/driving/${pickupLon},${pickupLat};${dropoffLon},${dropoffLat}?overview=full&geometries=geojson`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.routes?.[0]) {
          setRoute(
            data.routes[0].geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]] as L.LatLngExpression,
            ),
          );
        }
      })
      .catch(() => {
        setRoute([
          [pickupLat, pickupLon],
          [dropoffLat, dropoffLon],
        ]);
      });
  }, [pickupLat, pickupLon, dropoffLat, dropoffLon]);

  // Reverse geocode a map click
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!activeField) return;

      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      )
        .then((r) => r.json())
        .then((data) => {
          const address =
            data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          if (activeField === "pickup") {
            setPickup(address);
            setPickupLat(lat);
            setPickupLon(lng);
            setActiveField("dropoff");
          } else {
            setDropoff(address);
            setDropoffLat(lat);
            setDropoffLon(lng);
            setActiveField(null);
          }
        })
        .catch(() => {
          const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          if (activeField === "pickup") {
            setPickup(address);
            setPickupLat(lat);
            setPickupLon(lng);
            setActiveField("dropoff");
          } else {
            setDropoff(address);
            setDropoffLat(lat);
            setDropoffLon(lng);
            setActiveField(null);
          }
        });
    },
    [activeField],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext({
      pickupAddress: pickup,
      pickupLat,
      pickupLon,
      dropoffAddress: dropoff,
      dropoffLat,
      dropoffLon,
      date,
      time,
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const pickupCoords =
    pickupLat != null && pickupLon != null
      ? { lat: pickupLat, lon: pickupLon }
      : null;
  const dropoffCoords =
    dropoffLat != null && dropoffLon != null
      ? { lat: dropoffLat, lon: dropoffLon }
      : null;

  return (
    <div className="fixed inset-0 top-14">
      {/* Full-page map */}
      <MapContainer
        center={UK_CENTER}
        zoom={UK_ZOOM}
        className="w-full h-full"
        zoomControl
        scrollWheelZoom
        doubleClickZoom
        dragging
        attributionControl={false}
      >
        <TileLayer url={DARK_TILES} attribution={TILE_ATTR} />
        <MapController
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          activeField={activeField}
          onMapClick={handleMapClick}
        />
        {pickupCoords && (
          <Marker
            position={[pickupCoords.lat, pickupCoords.lon]}
            icon={pickupIcon()}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = e.target.getLatLng();
                setPickupLat(ll.lat);
                setPickupLon(ll.lng);
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
                const ll = e.target.getLatLng();
                setDropoffLat(ll.lat);
                setDropoffLon(ll.lng);
              },
            }}
          />
        )}
        {route.length > 0 && (
          <Polyline
            positions={route}
            pathOptions={{ color: "#3b82f6", weight: 4, opacity: 0.8 }}
          />
        )}
      </MapContainer>

      {/* Floating guide text */}
      {!pickupCoords && !dropoffCoords && (
        <div className="hidden md:block absolute top-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur text-gray-700 px-5 py-3 rounded-full text-sm font-medium animate-fade-in pointer-events-none z-[1001]">
          Enter your pickup and drop-off locations to get started
        </div>
      )}

      {/* ── CENTERED BOOKING CARD ── */}
      <form
        onSubmit={handleSubmit}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] pointer-events-auto w-full max-w-md mx-4 bg-white/80 backdrop-blur-2xl rounded-2xl border border-black/8 shadow-2xl p-6 space-y-4 animate-scale-in"
      >
        <div>
          <h1 className="text-xl font-bold text-gray-900">Book Your Ride</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter your locations or click on the map
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Pickup
          </label>
          <div className="relative">
            <AddressAutocomplete
              value={pickup}
              onChange={(addr, coords) => {
                setPickup(addr);
                setPickupLat(coords?.lat);
                setPickupLon(coords?.lon);
              }}
              required
              placeholder="e.g. Heathrow Airport"
              className="input-glass w-full pr-9"
            />
            <button
              type="button"
              onClick={() =>
                setActiveField(activeField === "pickup" ? null : "pickup")
              }
              title="Pick on map"
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                activeField === "pickup"
                  ? "text-blue-600 bg-blue-100/80"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <IconMapPin className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Drop-off
          </label>
          <div className="relative">
            <AddressAutocomplete
              value={dropoff}
              onChange={(addr, coords) => {
                setDropoff(addr);
                setDropoffLat(coords?.lat);
                setDropoffLon(coords?.lon);
              }}
              required
              placeholder="e.g. Central London"
              className="input-glass w-full pr-9"
            />
            <button
              type="button"
              onClick={() =>
                setActiveField(activeField === "dropoff" ? null : "dropoff")
              }
              title="Pick on map"
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                activeField === "dropoff"
                  ? "text-blue-600 bg-blue-100/80"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <IconMapPin className="w-4 h-4" />
            </button>
          </div>
        </div>

        {activeField && (
          <div className="flex items-center gap-2 bg-blue-100/80 text-blue-700 px-3 py-2 rounded-lg text-sm animate-fade-in">
            <IconMapPin className="w-4 h-4 shrink-0" />
            Click the map to set your{" "}
            {activeField === "pickup" ? "pickup" : "drop-off"}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              min={today}
              className="input-glass w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="input-glass w-full"
            />
          </div>
        </div>

        <button type="submit" className="w-full btn-primary text-base">
          Get Quote
        </button>
      </form>
    </div>
  );
}
