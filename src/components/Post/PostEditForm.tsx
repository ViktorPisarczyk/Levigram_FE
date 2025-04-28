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
    post.media.map((item) => ({
      url: item.url,
      poster: item.poster,
    }))
  );

  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useClickOutside(formRef, () => {
    if (!uploading) onCancel();
  });

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
          throw new Error(data.message || "Cloudinary upload failed");
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
        processedFiles.push({ url: URL.createObjectURL(file), rawFile: file });
      }
    }

    setMediaFiles((prev) => [...prev, ...processedFiles]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const filesToUpload = mediaFiles
        .filter((m) => m.rawFile)
        .map((m) => m.rawFile) as File[];

      const uploads = await uploadMediaFiles(filesToUpload);

      const uploadedMedia: MediaFile[] = uploads.map((u) => ({
        url: u.url,
        poster: u.poster,
      }));

      const existingMedia: MediaFile[] = mediaFiles.filter((m) => !m.rawFile);

      const finalMedia: MediaFile[] = [...existingMedia, ...uploadedMedia];

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

          <div className="media-preview-wrapper">
            <MediaPreviewCarousel
              mediaFiles={mediaFiles}
              onRemove={handleRemoveMedia}
            />
          </div>

          <label htmlFor="edit-media-upload" className="upload-button">
            Upload media files
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
              Cancel
            </button>
            <button
              type="submit"
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
            <p className="loading-text">Updating post...</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default PostEditForm;
