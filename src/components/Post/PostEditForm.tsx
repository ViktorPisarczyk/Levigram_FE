import React, { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../redux/store";
import { editPostAsync, fetchCommentsByPostId, Post } from "./postSlice";
import MediaPreviewCarousel from "../MediaPreviewCarousel/MediaPreviewCarousel";
import { useClickOutside } from "../../hooks/useClickOutside";
import heic2any from "heic2any";
import "./PostEditForm.scss";

interface MediaFile {
  url: string;
  poster?: string;
  rawFile?: File;
}

interface PostEditFormProps {
  post: Post;
  onCancel: () => void;
}

const PostEditForm: React.FC<PostEditFormProps> = ({ post, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [content, setContent] = useState(post.content);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(
    post.media.map((item) => ({ url: item.url, poster: item.poster }))
  );
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useClickOutside(formRef, () => {
    if (!uploading) onCancel();
  });

  const generatePoster = (url: string): Promise<string | undefined> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = url;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      video.addEventListener("loadedmetadata", () => {
        video.currentTime = 1;
      });

      video.addEventListener("seeked", () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg"));
          } else {
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

        return {
          url: data.secure_url,
          poster: finalPoster,
        };
      })
    );

    return uploads;
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const newMedia = mediaFiles.filter((m) => m.rawFile);
      const existingMedia = mediaFiles.filter((m) => !m.rawFile);
      const uploads = await uploadMediaFiles(newMedia);
      const finalMedia = [...existingMedia, ...uploads];

      await dispatch(
        editPostAsync({
          postId: post._id,
          content,
          media: finalMedia,
        })
      ).unwrap();

      await dispatch(fetchCommentsByPostId(post._id));
      onCancel();
    } catch (err) {
      console.error("Error updating post:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="post-edit-form">
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="form-content">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Edit your post..."
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

          <label htmlFor="edit-media-upload" className="upload-button">
            Bilder/Videos hochladen
          </label>
          <input
            id="edit-media-upload"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleMediaChange}
            style={{ display: "none" }}
          />

          <div className="actions">
            <button
              type="button"
              onClick={onCancel}
              disabled={uploading}
              className="cancel-button"
            >
              Abbrechen
            </button>
            <button
              type="submit"
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
            <p className="loading-text">Beitrag wird aktualisiert...</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default PostEditForm;
