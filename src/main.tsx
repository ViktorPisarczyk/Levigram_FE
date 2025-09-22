import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import App from "./App";
import "./index.scss";

import { autoEnableNotifications } from "./push";

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
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js"
      );

      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as
        | string
        | undefined;

      if (publicKey && Notification.permission === "granted") {
        try {
          const { ensureSubscriptionSynced } = await import("./push");
          await ensureSubscriptionSynced(publicKey);
        } catch (e) {
          console.warn("Silent resubscribe failed:", e);
        }
      }
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}
