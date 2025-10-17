import React, { useState, useRef, useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import {
  updateProfileAsync,
  logout,
} from "../../redux/features/auth/authSlice";

import { CiLogout } from "react-icons/ci";

import ConfirmModal from "../ConfirmModal/ConfirmModal";
import defaultAvatar from "../../assets/images/defaultAvatar.png";
import { useClickOutside } from "../../hooks/useClickOutside";
import "./ProfileEditForm.scss";

import { toast } from "react-hot-toast";

interface ProfileEditFormProps {
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  onClose,
  triggerRef,
}) => {
  useEffect(() => {
    const root = document.documentElement;
    const el = inputRef.current;
    if (!el) return;

    const onFocus = () => {
      root.classList.add("kb-open-any");
    };
    const onBlur = () => {
      root.classList.remove("kb-open-any");
    };

    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);

    return () => {
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
      root.classList.remove("kb-open-any");
    };
  }, []);
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [username, setUsername] = useState(user?.username || "");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(
    user?.profilePicture || defaultAvatar
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // <-- NEU

  const formRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    const el = inputRef.current;
    if (!el) return;

    const onFocus = () => {
      root.classList.add("kb-open-any");
    };
    const onBlur = () => {
      root.classList.remove("kb-open-any");
    };

    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);

    return () => {
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
      root.classList.remove("kb-open-any");
    };
  }, []);
  useClickOutside(
    formRef,
    () => {
      if (!uploading) onClose();
    },
    triggerRef
  );

  useEffect(() => {
    if (profileImage) {
      const objectUrl = URL.createObjectURL(profileImage);
      setPreviewUrl(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [profileImage]);

  useEffect(() => {
    if (!profileImage && user?.profilePicture) {
      setPreviewUrl(user.profilePicture);
    }
  }, [user?.profilePicture]);

  useEffect(() => {
    if (user?.username && user.username !== username) {
      setUsername(user.username);
    }
  }, [user?.username]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProfileImage(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!username.trim() && !profileImage) return;

    setUploading(true);
    try {
      let profileImageUrl: string | undefined = user?.profilePicture;

      if (profileImage) {
        const cloudName = import.meta.env.VITE_CLOUDINARY_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        const formData = new FormData();
        formData.append("file", profileImage);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", "uploads/profiles");

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await res.json();
        if (!res.ok || !data.secure_url) {
          throw new Error(data.message || "Fehler beim Hochladen");
        }
        profileImageUrl = data.secure_url;
      }

      const result = await dispatch(
        updateProfileAsync({ username, profilePicture: profileImageUrl })
      );

      if (updateProfileAsync.fulfilled.match(result)) {
        toast.success("Profil erfolgreich aktualisiert!");
        onClose();
      }
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
      toast.error("Profil konnte nicht gespeichert werden.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());

    const darkMode = localStorage.getItem("darkMode") === "true";
    document.body.setAttribute("data-theme", darkMode ? "dark" : "light");

    window.location.href = "/";
  };

  return (
    <div ref={formRef} className="profile-edit-form">
      <div className="form-header">
        <button
          type="button"
          className="logout-button"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <CiLogout />
          Abmelden
        </button>
      </div>

      <div className="form-content">
        <div className="profile-picture-preview">
          <img src={previewUrl} alt="Profile" />
        </div>

        <label htmlFor="profile-upload" className="upload-button">
          Profilbild hochladen
        </label>
        <input
          id="profile-upload"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{ display: "none" }}
        />

        <input
          ref={inputRef}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Dein Benutzername..."
        />

        <div className="actions">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="cancel-button"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading}
            className="submit-button"
          >
            Speichern
          </button>
        </div>
      </div>

      {uploading && (
        <div className="uploading-overlay">
          <div className="spinner" />
          <p className="loading-text">Profil wird aktualisiert...</p>
        </div>
      )}

      {showLogoutConfirm && (
        <ConfirmModal
          message="Bist du sicher, dass du dich abmelden möchtest?"
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
          confirmText="Abmelden"
        />
      )}
    </div>
  );
};

export default ProfileEditForm;
