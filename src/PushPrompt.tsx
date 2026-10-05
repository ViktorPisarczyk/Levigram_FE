import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { autoEnableNotifications } from "./push";

export default function PushPrompt() {
  const [show, setShow] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;

    const canPrompt =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default";

    if ((!isIOS || isStandalone) && canPrompt) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const onEnable = async () => {
    const pub = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!pub) {
      toast.error("Benachrichtigungen sind derzeit nicht verfügbar.");
      return;
    }

    setIsEnabling(true);
    try {
      const subscription = await autoEnableNotifications(pub);
      if (subscription) {
        setShow(false);
        toast.success("Benachrichtigungen sind aktiviert.");
      } else if (Notification.permission === "denied") {
        setShow(false);
        toast.error("Benachrichtigungen sind blockiert. Du kannst sie in den Browser-Einstellungen erlauben.");
      }
    } catch (e) {
      console.warn("Push enable failed:", e);
      toast.error("Benachrichtigungen konnten nicht aktiviert werden. Bitte erneut versuchen.");
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <button
      onClick={onEnable}
      disabled={isEnabling}
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
      {isEnabling ? "Wird aktiviert …" : "Benachrichtigungen erlauben"}
    </button>
  );
}
