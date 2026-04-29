import { useState, useEffect, useCallback } from "react";
import { getPublicKey, subscribe, unsubscribe } from "../api/notifications";

export type NotifPermission = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export function useNotifications(userId: number | null) {
  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const [permission, setPermission] = useState<NotifPermission>(
    !supported ? "unsupported" : (Notification.permission as NotifPermission),
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // On mount, check if already subscribed
  useEffect(() => {
    if (!supported || !userId) return;
    getCurrentSubscription()
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, [supported, userId]);

  // If permission was previously granted and user is logged in, auto-subscribe
  useEffect(() => {
    if (!supported || !userId || permission !== "granted" || subscribed) return;
    (async () => {
      const sub = await getCurrentSubscription();
      if (sub) {
        setSubscribed(true);
        return;
      }
      // Silent re-subscribe (no prompt needed — permission already granted)
      try {
        const { publicKey } = await getPublicKey();
        const reg = await navigator.serviceWorker.ready;
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const json = newSub.toJSON();
        await subscribe({
          endpoint: newSub.endpoint,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        });
        setSubscribed(true);
      } catch {
        // VAPID not configured or push not available — ignore silently
      }
    })();
  }, [supported, userId, permission, subscribed]);

  const requestAndSubscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as NotifPermission);
      if (perm !== "granted") return;

      const { publicKey } = await getPublicKey();
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await subscribe({
        endpoint: sub.endpoint,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });
      setSubscribed(true);
    } catch (e) {
      console.warn("Push subscription failed:", e);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const doUnsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const sub = await getCurrentSubscription();
      if (sub) {
        await unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      console.warn("Unsubscribe failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    supported,
    permission,
    subscribed,
    loading,
    requestAndSubscribe,
    doUnsubscribe,
  };
}
