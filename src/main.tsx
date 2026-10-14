import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import App from "./App";
import "./index.scss";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const swUrl = `${import.meta.env.BASE_URL || "/"}service-worker.js`;

      const registration = await navigator.serviceWorker.register(swUrl);

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            console.debug("[SW] update installed");
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.debug("[SW] controller changed");
      });

      const onVis = () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
          clearAppIndicators(registration);
        }
      };
      const onServiceWorkerMessage = (event: MessageEvent) => {
        if (
          document.visibilityState === "visible" &&
          event.data?.type === "LEVI_NEW_POST_RECEIVED"
        ) {
          clearAppIndicators(registration);
        }
      };
      document.addEventListener("visibilitychange", onVis);
      navigator.serviceWorker.addEventListener(
        "message",
        onServiceWorkerMessage
      );
      onVis();

      registration.update().catch(() => {});

      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as
        | string
        | undefined;

      if (publicKey && Notification.permission === "granted") {
        try {
          await navigator.serviceWorker.ready;
          const { ensureSubscriptionSynced } = await import("./push");
          await ensureSubscriptionSynced(publicKey);
        } catch (e) {
          console.warn("Silent resubscribe failed:", e);
        }
      }

      window.addEventListener("beforeunload", () => {
        document.removeEventListener("visibilitychange", onVis);
        navigator.serviceWorker.removeEventListener(
          "message",
          onServiceWorkerMessage
        );
      });
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}

async function clearAppIndicators(registration: ServiceWorkerRegistration) {
  const navigatorWithBadging = navigator as Navigator & {
    clearAppBadge?: () => Promise<void>;
  };

  try {
    await navigatorWithBadging.clearAppBadge?.();
  } catch {
    // App icon badges are optional and unsupported in some browsers.
  }

  try {
    const notifications = await registration.getNotifications({
      tag: "levigram-new-post",
    });
    notifications.forEach((notification) => notification.close());
  } catch {
    // The notification list is only used to clear Android launcher dots.
  }
}
