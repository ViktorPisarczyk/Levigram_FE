import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import "./ForgotPasswordPage.scss";

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/users/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "An error occurred. Please try again.");
      } else {
        toast.success("Password reset successfully!");
        navigate("/");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      toast.error("A server error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <h2>Reset your password</h2>
      <form onSubmit={handleReset} className="forgot-password-form">
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input"
        />

        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="input"
          minLength={6}
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="input"
          minLength={6}
        />

        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Processing..." : "Reset password"}
        </button>

        <button
          type="button"
          className="btn secondary"
          onClick={() => navigate("/")}
        >
          Back to login
        </button>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
