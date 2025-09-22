export async function autoEnableNotifications(vapidPublicKey: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as any).standalone;
  if (isIOS && !isStandalone) return null;

  if (Notification.permission === "default") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return null;
  } else if (Notification.permission !== "granted") {
    return null;
  }

  const reg = await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  await fetch("/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(sub),
  });

  return sub;
}

export async function ensureSubscriptionSynced(vapidPublicKey: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    if (Notification.permission !== "granted") return;
    const toKey = (base64: string) => {
      const pad = "=".repeat((4 - (base64.length % 4)) % 4);
      const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
      const raw = atob(b64);
      const out = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
      return out;
    };
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toKey(vapidPublicKey),
    });
  }

  await fetch("/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(sub),
  });
}

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
