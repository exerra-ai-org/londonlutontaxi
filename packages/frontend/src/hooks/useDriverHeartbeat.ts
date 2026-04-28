import { useState, useEffect, useRef, useCallback } from "react";
import { sendHeartbeat } from "../api/drivers";

export type GpsStatus = "idle" | "acquiring" | "active" | "no-gps" | "denied";

const HEARTBEAT_MS = 30_000;
const ACTIVE_STATUSES = new Set([
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
]);

export function useDriverHeartbeat(
  bookingId: number | null,
  status: string | null,
): { gpsStatus: GpsStatus } {
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const coordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);

  const isActive = Boolean(bookingId && status && ACTIVE_STATUSES.has(status));

  const beat = useCallback(async () => {
    if (!bookingId) return;
    try {
      await sendHeartbeat({
        bookingId,
        lat: coordsRef.current?.lat,
        lon: coordsRef.current?.lon,
      });
    } catch {
      // Missed heartbeat — backend watchdog handles recovery
    }
  }, [bookingId]);

  useEffect(() => {
    if (!isActive) {
      setGpsStatus("idle");
      coordsRef.current = null;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchRef.current !== null)
        navigator.geolocation?.clearWatch(watchRef.current);
      intervalRef.current = null;
      watchRef.current = null;
      return;
    }

    // Start GPS watch
    if ("geolocation" in navigator) {
      setGpsStatus("acquiring");
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          coordsRef.current = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };
          setGpsStatus("active");
        },
        () => setGpsStatus("denied"),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 },
      );
    } else {
      setGpsStatus("no-gps");
    }

    // Send first beat immediately, then on interval
    beat();
    intervalRef.current = setInterval(beat, HEARTBEAT_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchRef.current !== null)
        navigator.geolocation?.clearWatch(watchRef.current);
      intervalRef.current = null;
      watchRef.current = null;
    };
  }, [isActive, beat]);

  return { gpsStatus };
}
