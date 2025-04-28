import React, { ReactNode, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { useAppSelector, useAppDispatch } from "./redux/hooks";
import { loadUserFromLocalStorage } from "./redux/features/auth/authSlice";
import { setDarkMode } from "./redux/features/theme/themeSlice";

import { Toaster } from "react-hot-toast";

import Login from "./pages/LoginPage/LoginPage";
import Home from "./pages/HomePage/HomePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((state) => state.theme.darkMode);
  const location = useLocation();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const storedDarkMode = localStorage.getItem("darkMode");

    if (storedDarkMode !== null) {
      dispatch(setDarkMode(JSON.parse(storedDarkMode)));
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      dispatch(setDarkMode(prefersDark));
    }

    dispatch(loadUserFromLocalStorage());
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
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }
      setDeferredPrompt(null);
      setShowInstallButton(false);
    });
  };

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
          success: {
            icon: "✅",
          },
          error: {
            icon: "❌",
          },
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
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

export default App;
