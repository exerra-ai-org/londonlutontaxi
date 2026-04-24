import { Hono } from "hono";
import { db } from "../db/index";
import { vehicles } from "../db/schema";
import { ok, err } from "../lib/response";

export const vehicleRoutes = new Hono();

vehicleRoutes.get("/", async (c) => {
  try {
    const result = await db.select().from(vehicles);
    return ok(c, { vehicles: result });
  } catch (error) {
    console.error("Failed to fetch vehicles:", error);
    return err(c, "Failed to fetch vehicles", 500);
  }
});
