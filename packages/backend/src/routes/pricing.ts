import { Hono } from "hono";
import { pricingQuoteSchema } from "shared/validation";
import {
  getPricingQuote,
  getPricingQuoteAllClasses,
} from "../services/pricing";
import { ok, err } from "../lib/response";

export const pricingRoutes = new Hono();

pricingRoutes.get("/quote", async (c) => {
  const parsed = pricingQuoteSchema.safeParse({
    from: c.req.query("from"),
    to: c.req.query("to"),
    fromLat: c.req.query("fromLat"),
    fromLon: c.req.query("fromLon"),
    toLat: c.req.query("toLat"),
    toLon: c.req.query("toLon"),
    vehicleClass: c.req.query("vehicleClass"),
  });

  if (!parsed.success) {
    return err(c, "Missing 'from' and 'to' query parameters", 400);
  }

  const { from, to, fromLat, fromLon, toLat, toLon, vehicleClass } =
    parsed.data;

  try {
    const quote = await getPricingQuote(from, to, {
      fromLat,
      fromLon,
      toLat,
      toLon,
      vehicleClass,
    });

    if (!quote) {
      return err(c, "No pricing found for this route", 404);
    }

    return ok(c, {
      pricePence: quote.pricePence,
      routeType: quote.routeType,
      routeName: quote.routeName,
      isAirport: quote.isAirport,
      distanceMiles: quote.distanceMiles ?? null,
      baseFarePence: quote.baseFarePence ?? null,
      ratePerMilePence: quote.ratePerMilePence ?? null,
    });
  } catch (error) {
    console.error("Pricing endpoint error:", error);
    return err(c, "Failed to calculate pricing", 500);
  }
});

pricingRoutes.get("/quote-all", async (c) => {
  const parsed = pricingQuoteSchema.safeParse({
    from: c.req.query("from"),
    to: c.req.query("to"),
    fromLat: c.req.query("fromLat"),
    fromLon: c.req.query("fromLon"),
    toLat: c.req.query("toLat"),
    toLon: c.req.query("toLon"),
  });

  if (!parsed.success) {
    return err(c, "Missing 'from' and 'to' query parameters", 400);
  }

  const { from, to, fromLat, fromLon, toLat, toLon } = parsed.data;

  try {
    const result = await getPricingQuoteAllClasses(from, to, {
      fromLat,
      fromLon,
      toLat,
      toLon,
    });

    if (!result) {
      return err(c, "No pricing found for this route", 404);
    }

    return ok(c, result);
  } catch (error) {
    console.error("Pricing quote-all error:", error);
    return err(c, "Failed to calculate pricing", 500);
  }
});
