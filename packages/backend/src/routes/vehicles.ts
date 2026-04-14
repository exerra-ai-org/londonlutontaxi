import { Hono } from "hono";
import { db } from "../db/index";
import { vehicles } from "../db/schema";
import { ok } from "../lib/response";

export const vehicleRoutes = new Hono();

vehicleRoutes.get("/", async (c) => {
  const result = await db.select().from(vehicles);
  return ok(c, { vehicles: result });
});
