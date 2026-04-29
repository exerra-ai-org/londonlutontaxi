import { api } from "./client";
import type { Zone } from "shared/types";

export async function listZones(): Promise<{ zones: Zone[] }> {
  return api.get("/zones");
}

export async function getZone(id: number): Promise<{ zone: Zone }> {
  return api.get(`/zones/${id}`);
}
