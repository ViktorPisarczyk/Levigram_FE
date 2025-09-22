import { useEffect, useState } from "react";
import { autoEnableNotifications } from "./push";

export default function IosPushPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as any).standalone;
    if (isIOS && isStandalone && Notification.permission === "default") {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const onEnable = async () => {
    const pub = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
    try {
      await autoEnableNotifications(pub);
      setShow(false);
    } catch (e) {
      console.warn("iOS push enable failed:", e);
    }
  };

  return (
    <button
      onClick={onEnable}
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "14px 28px",
        background: "var(--quinary)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "bold",
        cursor: "pointer",
        zIndex: 9999,
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
      }}
    >
      Enable notifications
    </button>
  );
}
