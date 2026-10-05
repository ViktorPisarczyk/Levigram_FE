import { useState } from "react";
import { Link } from "react-router-dom";
import { autoEnableNotifications } from "../../push";

type Result = { message: string; outcome?: string; service?: string; statusCode?: number; reason?: string };

export default function PushTestPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const supported = typeof Notification !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  const test = async () => {
    setBusy(true);
    setResult(null);
    try {
      const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      if (!key) throw new Error("Benachrichtigungen sind noch nicht vollständig eingerichtet.");
      // Invoke directly from the click, preserving browser user activation.
      const subscription = await autoEnableNotifications(key);
      if (!subscription) {
        setResult({ message: Notification.permission === "denied"
          ? "Benachrichtigungen sind blockiert. Erlaube sie in den Website-Einstellungen und prüfe auch die Mitteilungseinstellungen deines Geräts."
          : "Bitte erlaube Benachrichtigungen. Auf iPhone und iPad öffne Levigram dazu als App vom Home-Bildschirm." });
        return;
      }
      const response = await fetch("/push/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (response.status === 401) {
        setResult({ message: "Deine Anmeldung ist abgelaufen. Bitte erneut anmelden." });
      } else {
        setResult({ ...data, message: data.message || "Der Test konnte nicht abgeschlossen werden." });
      }
    } catch (error) {
      setResult({ message: error instanceof Error && error.name === "TimeoutError"
        ? "Die Antwort dauert zu lange. Eine Nachricht könnte trotzdem unterwegs sein. Prüfe zunächst deine Mitteilungen."
        : error instanceof Error ? error.message : "Der Test ist fehlgeschlagen. Bitte erneut versuchen." });
    } finally { setBusy(false); }
  };

  return (
    <main style={{ maxWidth: 560, margin: "80px auto", padding: 24, color: "var(--text)", lineHeight: 1.6 }}>
      <h1>Benachrichtigungen testen</h1>
      <p>Die Testnachricht geht nur an diesen Browser beziehungsweise diese App-Installation. Es wird kein Beitrag erstellt und niemand anderes benachrichtigt.</p>
      <p>Öffne diese Seite direkt auf dem Gerät, dessen Benachrichtigungen du prüfen möchtest.</p>
      {!supported && <p role="alert">Dieser Browser unterstützt hier keine Pushnachrichten. Auf iPhone und iPad öffne Levigram vom Home-Bildschirm.</p>}
      <button type="button" disabled={busy || !supported} onClick={test}
        style={{ padding: "12px 20px", border: 0, borderRadius: 8, background: "var(--quinary)", color: "white", cursor: "pointer" }}>
        {busy ? "Test läuft …" : "Testnachricht an dieses Gerät senden"}
      </button>
      {result && <section aria-live="polite" style={{ marginTop: 24 }}>
        <p>{result.message}</p>
        {result.service && <p>Push-Dienst: {result.service}</p>}
        {result.reason && <p>Fehlercode: {result.reason}{result.statusCode ? ` (${result.statusCode})` : ""}</p>}
        {result.outcome === "accepted" && <p>Wenn nichts erscheint, prüfe die Benachrichtigungsberechtigungen für den Browser beziehungsweise Levigram in den Systemeinstellungen und ob „Nicht stören“ aktiv ist.</p>}
      </section>}
      <p><Link to="/home">Zurück zu Levigram</Link></p>
    </main>
  );
}
