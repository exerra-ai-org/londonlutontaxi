import { useState, useEffect, useRef, useCallback } from "react";
import { sendPresence } from "../api/drivers";
import type { GpsStatus } from "./useDriverHeartbeat";

const PRESENCE_INTERVAL_MS = 30_000;

function storageKey(driverId: number): string {
  return `driverOnDuty:${driverId}`;
}

function readInitialDuty(driverId: number | null): boolean {
  if (driverId == null || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey(driverId)) === "1";
  } catch {
    return false;
  }
}

function writeDuty(driverId: number, value: boolean): void {
  try {
    window.localStorage.setItem(storageKey(driverId), value ? "1" : "0");
  } catch {
    // localStorage unavailable (private mode, etc) — degrade silently
  }
}

// `suppressed` is set when another hook (useDriverHeartbeat) is already
// running watchPosition + sending pings on the driver's behalf. The
// backend mirrors heartbeat → driver_presence so the live map still
// updates; running a second GPS watcher and ping interval here is pure
// waste. The toggle state still persists, so flipping back to an
// idle (no-ride) on-duty state resumes presence pings cleanly.
export function useDriverPresence(
  driverId: number | null,
  suppressed = false,
): {
  isOnDuty: boolean;
  toggleOnDuty: () => void;
  gpsStatus: GpsStatus;
} {
  const [isOnDuty, setIsOnDuty] = useState<boolean>(() =>
    readInitialDuty(driverId),
  );
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const coordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);
  // Ensures the first ping that includes GPS coords fires as soon as the
  // browser resolves a fix, instead of waiting up to PRESENCE_INTERVAL_MS.
  // Without this, the very first /presence call (which is sent immediately
  // when the user toggles on) has no coords, and the admin map's
  // coords-required filter hides the driver until the next interval tick.
  const firstCoordPingDoneRef = useRef(false);

  // Sync local state if driverId changes (e.g. log out / log in).
  useEffect(() => {
    setIsOnDuty(readInitialDuty(driverId));
  }, [driverId]);

  const ping = useCallback(
    async (duty: boolean) => {
      if (driverId == null) return;
      try {
        await sendPresence({
          isOnDuty: duty,
          lat: duty ? coordsRef.current?.lat : undefined,
          lon: duty ? coordsRef.current?.lon : undefined,
        });
      } catch {
        // Server will drop the driver from "live" after the staleness window
      }
    },
    [driverId],
  );

  useEffect(() => {
    if (driverId == null) return;

    if (!isOnDuty || suppressed) {
      setGpsStatus("idle");
      coordsRef.current = null;
      firstCoordPingDoneRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchRef.current !== null)
        navigator.geolocation?.clearWatch(watchRef.current);
      intervalRef.current = null;
      watchRef.current = null;
      // Send a final off-duty ping ONLY when the user actually toggled off.
      // If we're suppressed by an active heartbeat, the heartbeat is
      // mirroring driver_presence on the server already and a "go off
      // duty" ping would falsely yank the marker off the live map.
      if (!isOnDuty) ping(false);
      return;
    }

    firstCoordPingDoneRef.current = false;

    if ("geolocation" in navigator) {
      setGpsStatus("acquiring");
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          coordsRef.current = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };
          setGpsStatus("active");
          // Fire one extra ping the moment GPS first resolves so the admin
          // map can place this driver without waiting for the next interval.
          if (!firstCoordPingDoneRef.current) {
            firstCoordPingDoneRef.current = true;
            ping(true);
          }
        },
        () => setGpsStatus("denied"),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
      );
    } else {
      setGpsStatus("no-gps");
    }

    ping(true);
    intervalRef.current = setInterval(() => ping(true), PRESENCE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchRef.current !== null)
        navigator.geolocation?.clearWatch(watchRef.current);
      intervalRef.current = null;
      watchRef.current = null;
    };
  }, [driverId, isOnDuty, suppressed, ping]);

  const toggleOnDuty = useCallback(() => {
    if (driverId == null) return;
    setIsOnDuty((prev) => {
      const next = !prev;
      writeDuty(driverId, next);
      return next;
    });
  }, [driverId]);

  return { isOnDuty, toggleOnDuty, gpsStatus };
}
