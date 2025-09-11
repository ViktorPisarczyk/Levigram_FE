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

console.log("VITE_VAPID_PUBLIC_KEY:", import.meta.env.VITE_VAPID_PUBLIC_KEY);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js"
      );
      console.log("Service Worker registered with scope:", registration.scope);

      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as
        | string
        | undefined;
      if (publicKey) {
        try {
          await autoEnableNotifications(publicKey);
        } catch (e) {
          console.warn("Auto-enable notifications failed:", e);
        }
      } else {
        console.warn(
          "VITE_VAPID_PUBLIC_KEY is missing – set it in your frontend env."
        );
      }
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}
