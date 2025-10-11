import React, { ReactNode, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "./redux/hooks";
import { checkAuthAsync } from "./redux/features/auth/authSlice";
import { setDarkMode } from "./redux/features/theme/themeSlice";
import { Toaster } from "react-hot-toast";

import Login from "./pages/LoginPage/LoginPage";
import Home from "./pages/HomePage/HomePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";
import IosPushPrompt from "./IosPushPrompt";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, status } = useAppSelector((state) => state.auth);

  if (status === "loading") {
    return <div className="loading-screen">Loading authentication...</div>;
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();

  const { darkMode } = useAppSelector((state) => state.theme);
  const { isAuthenticated, status } = useAppSelector((state) => state.auth);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // Auth + Theme
  useEffect(() => {
    dispatch(checkAuthAsync());
    const storedDarkMode = localStorage.getItem("darkMode");
    if (storedDarkMode !== null) {
      dispatch(setDarkMode(JSON.parse(storedDarkMode)));
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      dispatch(setDarkMode(prefersDark));
    }
  }, [dispatch]);

  useEffect(() => {
    document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode, location.pathname]);

  // PWA Install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(() => {
      setDeferredPrompt(null);
      setShowInstallButton(false);
    });
  };

  // Push subscription resync
  useEffect(() => {
    const pub = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!pub) return;

    const canSync =
      status === "succeeded" &&
      isAuthenticated &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted";

    if (!canSync) return;

    (async () => {
      try {
        const { ensureSubscriptionSynced } = await import("./push");
        await ensureSubscriptionSynced(pub);
      } catch (e) {
        console.warn("Resync subscription failed:", e);
      }
    })();
  }, [status, isAuthenticated]);

  // Keyboard handling (mobile)
  useEffect(() => {
    const root = document.documentElement;
    const vv = (window as any).visualViewport as VisualViewport | undefined;

    const onVVChange = () => {
      if (!vv) return;
      const offset = Math.max(0, window.innerHeight - vv.height);
      root.style.setProperty("--kb-offset", `${Math.round(offset)}px`);
      if (offset > 0) root.classList.add("kb-open-any");
      else {
        root.classList.remove("kb-open-any");
        root.classList.remove("kb-open-search");
      }
    };

    vv?.addEventListener("resize", onVVChange);
    vv?.addEventListener("scroll", onVVChange);
    onVVChange();

    let lastDockedEl: Element | null = null;
    const DOCK_SELECTOR =
      ".search-form, .post-create-form, .profile-edit-form, .comment-form, [data-dock-on-kb]";

    const onFocusIn = (e: Event) => {
      const t = e.target as Element | null;
      if (!t) return;

      const inSearch = !!t.closest(".search-form");
      root.classList.toggle("kb-open-search", inSearch);

      const dock = t.closest(DOCK_SELECTOR);
      if (lastDockedEl && lastDockedEl !== dock) {
        lastDockedEl.classList.remove("dock-at-kb");
        lastDockedEl = null;
      }
      if (dock) {
        dock.classList.add("dock-at-kb");
        lastDockedEl = dock;
      }
    };

    const onFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as Element | null;
        const inSearch = !!active?.closest?.(".search-form");
        root.classList.toggle("kb-open-search", inSearch);

        const stillField =
          !!active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            (active as HTMLElement).isContentEditable);
        if (!stillField && lastDockedEl) {
          lastDockedEl.classList.remove("dock-at-kb");
          lastDockedEl = null;
        }
      }, 0);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      vv?.removeEventListener("resize", onVVChange);
      vv?.removeEventListener("scroll", onVVChange);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      root.classList.remove("kb-open-any");
      root.classList.remove("kb-open-search");
      root.style.removeProperty("--kb-offset");
    };
  }, []);

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--secondary)",
            color: "var(--text)",
            borderRadius: "8px",
            padding: "10px 16px",
            fontSize: "14px",
          },
          success: { icon: "✅" },
          error: { icon: "❌" },
        }}
      />

      {showInstallButton && (
        <button
          onClick={handleInstallClick}
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "10px 20px",
            background: "var(--quinary)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            zIndex: 9999,
            fontWeight: "bold",
          }}
        >
          Install App
        </button>
      )}

      <Routes>
        <Route
          path="/"
          element={
            status === "loading" ? (
              <div className="loading-screen">Loading…</div>
            ) : isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <Login />
            )
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <IosPushPrompt />
    </>
  );
};

export default App;
