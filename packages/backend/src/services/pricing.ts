import { db } from "../db/index";
import { fixedRoutes, zones, zonePricing } from "../db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import type { PricingQuote } from "shared/types";
import { LONDON_ZONE_PATTERN } from "../lib/constants";

const INTRA_ZONE_PRICE_PENCE = 2000; // £20 for travel within the same zone

export async function getZoneByAddress(address: string) {
  const results = await db
    .select()
    .from(zones)
    .where(sql`${address} ILIKE '%' || ${zones.label} || '%'`);
  return results[0] ?? null;
}

/**
 * Simple bounding-box check for rectangular zone polygons.
 */
function pointInBoundary(
  lat: number,
  lon: number,
  boundary: { coordinates?: number[][][] },
): boolean {
  const ring = boundary?.coordinates?.[0];
  if (!ring || ring.length < 4) return false;
  const lons = ring.map((c) => c[0]);
  const lats = ring.map((c) => c[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

/**
 * Coordinate-based zone lookup. Tries PostGIS first, falls back to JS bounding-box check.
 */
export async function getZoneByCoordinates(lat: number, lon: number) {
  // Try PostGIS spatial query first
  try {
    const results = await db
      .select()
      .from(zones)
      .where(
        sql`${zones.boundary} IS NOT NULL AND ST_Contains(
          ST_GeomFromGeoJSON(${zones.boundary}::text),
          ST_Point(${lon}, ${lat})
        )`,
      )
      .limit(1);
    if (results.length > 0) return results[0];
  } catch {
    // PostGIS not available — fall through to JS check
  }

  // Fallback: load all zones and check bounding box in JS
  const allZones = await db.select().from(zones);
  return (
    allZones.find(
      (z) =>
        z.boundary &&
        pointInBoundary(lat, lon, z.boundary as { coordinates?: number[][][] }),
    ) ?? null
  );
}

export function isLondonZone(zoneName: string): boolean {
  return LONDON_ZONE_PATTERN.test(zoneName);
}

async function getZonePriceForZones(fromZoneId: number, toZoneId: number) {
  return db
    .select()
    .from(zonePricing)
    .where(
      or(
        and(
          eq(zonePricing.fromZoneId, fromZoneId),
          eq(zonePricing.toZoneId, toZoneId),
        ),
        and(
          eq(zonePricing.fromZoneId, toZoneId),
          eq(zonePricing.toZoneId, fromZoneId),
        ),
      ),
    )
    .limit(1);
}

export async function getPricingQuote(
  from: string,
  to: string,
  opts?: {
    fromLat?: number;
    fromLon?: number;
    toLat?: number;
    toLon?: number;
  },
): Promise<
  | (PricingQuote & {
      fixedRouteId?: number;
      pickupZoneId?: number;
      dropoffZoneId?: number;
    })
  | null
> {
  try {
    // 1. Check fixed routes first (highest priority)
    const fixedMatch = await db
      .select()
      .from(fixedRoutes)
      .where(
        and(
          sql`${from} ILIKE '%' || ${fixedRoutes.fromLabel} || '%'`,
          sql`${to} ILIKE '%' || ${fixedRoutes.toLabel} || '%'`,
        ),
      )
      .limit(1);

    if (fixedMatch.length > 0) {
      const route = fixedMatch[0];
      return {
        pricePence: route.pricePence,
        routeType: "fixed",
        routeName: route.name,
        isAirport: route.isAirport,
        fixedRouteId: route.id,
      };
    }

    // 2. Zone-based pricing — prefer coordinate lookup, fall back to text
    let pickupZone = null;
    let dropoffZone = null;

    if (
      opts?.fromLat != null &&
      opts?.fromLon != null &&
      opts?.toLat != null &&
      opts?.toLon != null
    ) {
      [pickupZone, dropoffZone] = await Promise.all([
        getZoneByCoordinates(opts.fromLat, opts.fromLon),
        getZoneByCoordinates(opts.toLat, opts.toLon),
      ]);
    }

    // Text fallback for either or both zones
    if (!pickupZone) pickupZone = await getZoneByAddress(from);
    if (!dropoffZone) dropoffZone = await getZoneByAddress(to);

    if (!pickupZone || !dropoffZone) {
      return null;
    }

    // Same-zone travel — use intra-zone base price
    if (pickupZone.id === dropoffZone.id) {
      return {
        pricePence: INTRA_ZONE_PRICE_PENCE,
        routeType: "zone",
        routeName: null,
        isAirport: false,
        pickupZoneId: pickupZone.id,
        dropoffZoneId: dropoffZone.id,
      };
    }

    const zonePrice = await getZonePriceForZones(pickupZone.id, dropoffZone.id);

    if (zonePrice.length > 0) {
      return {
        pricePence: zonePrice[0].pricePence,
        routeType: "zone",
        routeName: null,
        isAirport: false,
        pickupZoneId: pickupZone.id,
        dropoffZoneId: dropoffZone.id,
      };
    }

    return null;
  } catch (error) {
    console.error("Pricing query failed:", error);
    return null;
  }
}
