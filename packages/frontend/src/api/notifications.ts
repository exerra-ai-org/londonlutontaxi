import { api } from "./client";

export function getPublicKey() {
  return api.get<{ publicKey: string }>("/notifications/public-key");
}

export interface PushSubscriptionRow {
  id: number;
  endpoint: string;
  createdAt: string;
}

export function listSubscriptions() {
  return api.get<{ subscriptions: PushSubscriptionRow[] }>(
    "/notifications/subscriptions",
  );
}

export function subscribe(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  return api.post<{ subscription: PushSubscriptionRow }>(
    "/notifications/subscribe",
    input,
  );
}

export function unsubscribe(endpoint: string) {
  return api.post<{ message: string }>("/notifications/unsubscribe", {
    endpoint,
  });
}
