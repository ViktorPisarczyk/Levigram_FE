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
        }
      };
      document.addEventListener("visibilitychange", onVis);

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
      });
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}
