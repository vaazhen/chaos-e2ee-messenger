import { api } from "./api";

export async function registerPushSubscription() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const reg = await navigator.serviceWorker.register("/sw.js");
    const vapidKey = await api.getVapidKey();
    if (!vapidKey) return;
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    await api.subscribePush(subscription.toJSON());
  } catch (e) {
    console.warn("[Push] registration failed:", e.message);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
