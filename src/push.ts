export async function autoEnableNotifications(vapidPublicKey: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push not supported in this browser");
    return null;
  }

  // iOS: Web-Push only in installed PWA (Homescreen). In a normal Safari tab it doesn't work.
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as any).standalone;
  if (isIOS && !isStandalone) {
    console.warn("iOS requires installation as a Homescreen app for Web-Push.");
    return null;
  }

  // 1) Request permission (directly on first start is ok)
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  // 2) SW ready
  const reg = await navigator.serviceWorker.ready;

  // 3) Subscribe
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  // 4) Send subscription to backend
  await fetch("/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });

  return sub;
}

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
