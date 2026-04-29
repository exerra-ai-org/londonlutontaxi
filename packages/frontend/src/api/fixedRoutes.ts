import { api } from "./client";
import type { FixedRoute } from "shared/types";

export function listFixedRoutes() {
  return api.get<{ routes: FixedRoute[] }>("/fixed-routes");
}

export function getFixedRoute(id: number) {
  return api.get<{ route: FixedRoute }>(`/fixed-routes/${id}`);
}

export interface FixedRouteInput {
  name: string;
  fromLabel: string;
  toLabel: string;
  pricePence: number;
  isAirport?: boolean;
}

export function createFixedRoute(input: FixedRouteInput) {
  return api.post<{ route: FixedRoute }>("/fixed-routes", input);
}

export function updateFixedRoute(id: number, input: Partial<FixedRouteInput>) {
  return api.patch<{ route: FixedRoute }>(`/fixed-routes/${id}`, input);
}

export function deleteFixedRoute(id: number) {
  return api.delete<{ route: FixedRoute }>(`/fixed-routes/${id}`);
}
