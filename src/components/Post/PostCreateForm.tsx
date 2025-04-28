import React, { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import { addPost } from "./postSlice";
import heic2any from "heic2any";
import MediaPreviewCarousel from "../MediaPreviewCarousel/MediaPreviewCarousel";
import { useClickOutside } from "../../hooks/useClickOutside";
import "./PostCreateForm.scss";

const API_URL = import.meta.env.VITE_API_URL;

interface PostCreateFormProps {
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

interface MediaFile {
  url: string;
  poster?: string;
  rawFile?: File; // für Upload (optional)
}

const PostCreateForm: React.FC<PostCreateFormProps> = ({
  onClose,
  triggerRef,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const uploadMediaFiles = async (files: File[]) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    const uploads = await Promise.all(
      files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", "uploads/posts");

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await res.json();

        if (!res.ok || !data.secure_url) {
          throw new Error(data.message || "Cloudinary upload error");
        }

        let posterUrl: string | undefined;
        if (file.type.startsWith("video/")) {
          posterUrl = data.secure_url.replace("/upload/", "/upload/so_1/");
        }

        return {
          url: data.secure_url,
          poster: posterUrl,
        };
      })
    );

    return uploads;
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const processedFiles: MediaFile[] = [];

    for (const file of files) {
      if (file.type === "image/heic" || file.name.endsWith(".heic")) {
        try {
          const blob = await heic2any({ blob: file, toType: "image/jpeg" });
          const converted = new File(
            [blob as BlobPart],
            file.name.replace(/\.heic$/, ".jpg"),
            { type: "image/jpeg" }
          );
          processedFiles.push({
            url: URL.createObjectURL(converted),
            rawFile: converted,
          });
        } catch (err) {
          console.error("HEIC conversion failed", err);
        }
      } else {
        processedFiles.push({ url: URL.createObjectURL(file), rawFile: file });
      }
    }

    setMediaFiles((prev) => [...prev, ...processedFiles]);
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0) return;

    setUploading(true);
    try {
      const token = localStorage.getItem("token");

      const filesToUpload = mediaFiles
        .map((m) => m.rawFile)
        .filter(Boolean) as File[];
      const uploads = await uploadMediaFiles(filesToUpload);

      const mediaUrls = uploads.map((u) => u.url);
      const posterUrls = uploads.map((u) => u.poster).filter(Boolean);

      const res = await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          media: uploads, // wichtig: media = [{url, poster}]
        }),
      });

      const postData = await res.json();

      if (!res.ok) {
        console.error("Error saving post:", postData.message || postData);
        return;
      }

      dispatch(addPost(postData));
      setContent("");
      setMediaFiles([]);
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  useClickOutside(
    formRef,
    () => {
      if (!uploading) onClose();
    },
    triggerRef
  );

  return (
    <div ref={formRef} className="post-create-form">
      <div className="form-content">
        <textarea
          placeholder="Please add a text..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        ></textarea>

        <div className="media-preview-wrapper">
          <MediaPreviewCarousel
            mediaFiles={mediaFiles}
            onRemove={(index) =>
              setMediaFiles((prev) => prev.filter((_, i) => i !== index))
            }
          />
        </div>

        <label htmlFor="media-upload" className="upload-button">
          Upload media files
        </label>
        <input
          id="media-upload"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleMediaChange}
          style={{ display: "none" }}
        />

        <div className="actions">
          <button
            onClick={onClose}
            disabled={uploading}
            className="cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="submit-button"
          >
            Save
          </button>
        </div>
      </div>

      {uploading && (
        <div className="uploading-overlay">
          <div className="spinner" />
          <p className="loading-text">Post is loading...</p>
        </div>
      )}
    </div>
  );
};

export default PostCreateForm;
