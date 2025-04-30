import React, { ReactNode, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "./redux/hooks";
import { checkAuthAsync } from "./redux/features/auth/authSlice";
import { setDarkMode } from "./redux/features/theme/themeSlice";
import { Toaster } from "react-hot-toast";

import Login from "./pages/LoginPage/LoginPage";
import Home from "./pages/HomePage/HomePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";

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
  const { user, isAuthenticated, status } = useAppSelector(
    (state) => state.auth
  );

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

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
    deferredPrompt.userChoice.then((choiceResult: any) => {
      setDeferredPrompt(null);
      setShowInstallButton(false);
    });
  };

  // ✅ Debug logging
  useEffect(() => {
    console.log("🔐 Auth status:", status);
    console.log("👤 User:", user);
    console.log("✅ isAuthenticated:", isAuthenticated);
  }, [status, user, isAuthenticated]);

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
    </>
  );
};

export default App;
