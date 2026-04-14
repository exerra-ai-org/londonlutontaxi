const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const METERS_PER_MILE = 1609.344;

export interface OsrmResult {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
}

export async function getOsrmDistance(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): Promise<OsrmResult | null> {
  try {
    const url = `${OSRM_BASE}/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    return {
      distanceMeters: route.distance,
      distanceMiles: Math.round((route.distance / METERS_PER_MILE) * 10) / 10,
      durationSeconds: route.duration,
    };
  } catch {
    return null;
  }
}
