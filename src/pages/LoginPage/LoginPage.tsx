import React from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";

import { useNavigate } from "react-router-dom";

import {
  login,
  signup,
  toggleLoginMode,
  updateFormField,
} from "../../redux/features/auth/authSlice";

import { toast } from "react-hot-toast";

import "./LoginPage.scss";

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLogin, formData } = useAppSelector((state) => state.auth);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch(updateFormField({ name, value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const resultAction = isLogin
        ? await dispatch(login({ formData, navigate }))
        : await dispatch(signup({ formData, navigate }));

      if (signup.fulfilled.match(resultAction)) {
        toast.success("Registration successful! Please log in.");
        dispatch(toggleLoginMode());
      } else if (signup.rejected.match(resultAction)) {
        toast.error("Registration failed. Please check your details.");
      }

      if (login.fulfilled.match(resultAction)) {
        toast.success("Login successful!");
      } else if (login.rejected.match(resultAction)) {
        toast.error("Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again later.");
    }
  };

  return (
    <div className="login-page">
      <div className="logo"></div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="form">
          {/* Nur bei Registrierung */}
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  className="login-input"
                  value={formData.username}
                  onChange={handleChange}
                  maxLength={20}
                  required
                />
              </div>

              <div className="form-group">
                <label>Invitation Code</label>
                <input
                  type="text"
                  name="inviteCode"
                  className="login-input"
                  value={formData.inviteCode || ""}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              className="login-input"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              className="login-input"
              value={formData.password}
              onChange={handleChange}
              maxLength={20}
              required
            />
          </div>

          <button type="submit" className="btn">
            {isLogin ? "Log In" : "Create new account"}
          </button>
        </form>

        {isLogin && (
          <div className="extra-options">
            <button onClick={() => navigate("/forgot-password")}>
              Forgot password?
            </button>
          </div>
        )}

        <div className="extra-options">
          <button
            type="button"
            onClick={() => dispatch(toggleLoginMode())}
            className="btn toggle"
          >
            {isLogin ? "Create a new account" : "Back to login page"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
