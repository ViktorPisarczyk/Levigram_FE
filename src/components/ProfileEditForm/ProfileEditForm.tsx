import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import {
  updateProfileAsync,
  logout,
} from "../../redux/features/auth/authSlice";
import { uploadToCloudinary, CLOUDINARY } from "../../cloudinary";
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
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const [username, setUsername] = useState(user?.username || "");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(
    user?.profilePicture || defaultAvatar
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  useClickOutside(
    formRef,
    () => {
      if (!uploading) {
        document.documentElement.classList.remove("kb-open-any");
        const active = document.activeElement as HTMLElement | null;
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          active.blur();
        }
        onClose();
      }
    },
    triggerRef
  );

  useEffect(() => {
    if (profileImage) {
      const objectUrl = URL.createObjectURL(profileImage);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
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
    if (e.target.files?.length) setProfileImage(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!username.trim() && !profileImage) return;

    setUploading(true);
    try {
      let profileImageUrl: string | undefined = user?.profilePicture;

      if (profileImage) {
        // EIN Upload-Call, sauber unsigned:
        const up = await uploadToCloudinary(
          profileImage,
          CLOUDINARY.folderProfiles
        );
        profileImageUrl = up.secure_url;
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

  useEffect(() => {
    const root = document.documentElement;
    const input = formRef.current?.querySelector('input[type="text"]');
    if (!input) return;
    const handleFocus = () => root.classList.add("kb-open-any");
    const handleBlur = () => root.classList.remove("kb-open-any");
    input.addEventListener("focus", handleFocus);
    input.addEventListener("blur", handleBlur);
    return () => {
      input.removeEventListener("focus", handleFocus);
      input.removeEventListener("blur", handleBlur);
      root.classList.remove("kb-open-any");
    };
  }, []);

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
