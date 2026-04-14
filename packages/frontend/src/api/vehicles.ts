import { api } from "./client";
import type { Vehicle } from "shared/types";

export async function listVehicles() {
  return api.get<{ vehicles: Vehicle[] }>("/api/vehicles");
}
