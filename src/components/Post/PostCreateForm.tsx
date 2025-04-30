import React, { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import { addPost } from "./postSlice";
import heic2any from "heic2any";
import MediaPreviewCarousel from "../MediaPreviewCarousel/MediaPreviewCarousel";
import { useClickOutside } from "../../hooks/useClickOutside";
import "./PostCreateForm.scss";

interface PostCreateFormProps {
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

interface MediaFile {
  url: string;
  poster?: string;
  rawFile?: File;
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

  useClickOutside(
    formRef,
    () => {
      if (!uploading) onClose();
    },
    triggerRef
  );

  const generatePoster = (url: string): Promise<string | undefined> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = url;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      video.addEventListener("canplay", () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataURL = canvas.toDataURL("image/jpeg");
            resolve(dataURL);
          } else {
            console.warn("⚠️ Kein 2D-Kontext");
            resolve(undefined);
          }
        } catch (err) {
          console.error("❌ Fehler beim Zeichnen des Posters", err);
          resolve(undefined);
        }
      });

      video.addEventListener("error", () => {
        console.error("❌ Fehler beim Laden des Videos für Poster", url);
        resolve(undefined);
      });

      video.load();
    });
  };

  const uploadPosterImage = async (dataUrl: string): Promise<string> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const blob = await (await fetch(dataUrl)).blob();

    const formData = new FormData();
    formData.append("file", blob);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "uploads/posts/posters");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    if (!res.ok || !data.secure_url)
      throw new Error(data.message || "Poster upload failed");

    return data.secure_url;
  };

  const uploadMediaFiles = async (files: MediaFile[]) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    const uploads = await Promise.all(
      files.map(async (media) => {
        const file = media.rawFile!;
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
        if (!res.ok || !data.secure_url)
          throw new Error(data.message || "Upload failed");

        let finalPoster = media.poster;
        if (finalPoster?.startsWith("data:")) {
          try {
            finalPoster = await uploadPosterImage(finalPoster);
          } catch (err) {
            console.warn("Poster upload failed:", err);
          }
        }

        return { url: data.secure_url, poster: finalPoster };
      })
    );

    return uploads;
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      console.warn("🚫 No files found");
      return;
    }

    const files = Array.from(e.target.files);

    const processedFiles: MediaFile[] = [];

    for (const file of files) {
      if (file.type === "image/heic" || file.name.endsWith(".heic")) {
        try {
          const blob = await heic2any({ blob: file, toType: "image/jpeg" });
          const converted = new File(
            [blob as BlobPart],
            file.name.replace(/\.heic$/, ".jpg"),
            {
              type: "image/jpeg",
            }
          );
          processedFiles.push({
            url: URL.createObjectURL(converted),
            rawFile: converted,
          });
        } catch (err) {
          console.error("HEIC conversion failed", err);
        }
      } else {
        const url = URL.createObjectURL(file);
        let poster: string | undefined;

        if (file.type.startsWith("video/")) {
          try {
            poster = await generatePoster(url);
          } catch (err) {
            console.error("Poster generation failed:", err);
          }
        }

        processedFiles.push({ url, rawFile: file, poster });
      }
    }

    setMediaFiles((prev) => [...prev, ...processedFiles]);
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0) return;

    setUploading(true);
    try {
      const uploads = await uploadMediaFiles(mediaFiles);

      const res = await fetch(`/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ content, media: uploads }),
      });

      const postData = await res.json();
      if (!res.ok) {
        console.error("Error saving post:", postData.message || postData);
        return;
      }

      dispatch(addPost(postData));
      setContent("");
      setTimeout(() => {
        setMediaFiles([]);
        onClose();
      }, 500);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div ref={formRef} className="post-create-form">
      <div className="form-content">
        <textarea
          placeholder="Please add a text..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {mediaFiles.length > 0 && (
          <div className="media-preview-wrapper">
            <MediaPreviewCarousel
              mediaFiles={mediaFiles}
              onRemove={(index) => {
                setMediaFiles((prev) => {
                  const updated = prev.filter((_, i) => i !== index);
                  if (index === mediaFiles.length - 1 && updated.length > 0) {
                    setTimeout(() => {
                      const slider = document.querySelector(".keen-slider");
                      if (slider) {
                        (slider as any).keenSlider?.moveToIdx(
                          updated.length - 1
                        );
                      }
                    }, 0);
                  }
                  return updated;
                });
              }}
            />
          </div>
        )}

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
          <p className="loading-text">Post is loading…</p>
        </div>
      )}
    </div>
  );
};

export default PostCreateForm;
