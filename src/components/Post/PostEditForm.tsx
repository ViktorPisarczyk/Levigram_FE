import React, { useState, useRef } from "react";
import heic2any from "heic2any";
import MediaPreviewCarousel from "../MediaPreviewCarousel/MediaPreviewCarousel";
import { useClickOutside } from "../../hooks/useClickOutside";
import "./PostEditForm.scss";
import {
  uploadToCloudinary,
  uploadPosterDataUrl,
  CLOUDINARY,
} from "../../cloudinary";
import type { FeedItem } from "../../types/models";
import { useEditPostMutation } from "../../redux/apiSlice";

interface MediaFile {
  url: string;
  poster?: string;
  rawFile?: File;
}

interface PostEditFormProps {
  post: FeedItem;
  onCancel: () => void;
}

const MAX_IMG_DIM = 1600;
const MAX_POSTER_DIM = 720;
const DEFAULT_Q = 0.6;
const SAVEDATA_Q = 0.5;

const supportsWebP = (() => {
  try {
    return typeof document !== "undefined"
      ? !!document
          .createElement("canvas")
          .toDataURL("image/webp")
          .startsWith("data:image/webp")
      : true;
  } catch {
    return false;
  }
})();

function getQuality(): number {
  const nav = navigator as any;
  const saveData = !!nav?.connection?.saveData;
  return saveData ? SAVEDATA_Q : DEFAULT_Q;
}

async function imageToBitmap(file: File | Blob): Promise<ImageBitmap> {
  const blob =
    file instanceof Blob
      ? file
      : new Blob([file], { type: (file as File).type });
  return await createImageBitmap(blob);
}
function scaleDims(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { w, h };
  const ratio = w / h;
  if (w > h) return { w: max, h: Math.round(max / ratio) };
  return { w: Math.round(max * ratio), h: max };
}
async function compressImageToWebP(
  file: File | Blob,
  maxDim = MAX_IMG_DIM,
  quality = getQuality()
): Promise<File> {
  const bmp = await imageToBitmap(file);
  const { w, h } = scaleDims(bmp.width, bmp.height, maxDim);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const mime = supportsWebP ? "image/webp" : "image/jpeg";
  const dataUrl = canvas.toDataURL(mime, quality);
  const bin = atob(dataUrl.split(",")[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: mime });
  const ext = supportsWebP ? "webp" : "jpg";
  return new File([blob], `upload.${ext}`, { type: blob.type });
}
async function makePosterFromVideo(
  url: string,
  maxDim = MAX_POSTER_DIM,
  quality = getQuality()
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = url;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    const onReady = () => {
      try {
        const vw = video.videoWidth || 1280;
        const vh = video.videoHeight || 720;
        const { w, h } = scaleDims(vw, vh, maxDim);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0, w, h);
        const mime = supportsWebP ? "image/webp" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mime, quality);
        resolve(dataUrl);
      } catch {
        resolve(undefined);
      }
    };
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", () => resolve(undefined), { once: true });
    video.load();
  });
}

const PostEditForm: React.FC<PostEditFormProps> = ({ post, onCancel }) => {
  const [editPost] = useEditPostMutation();

  const [content, setContent] = useState(post.content);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(
    post.media.map((item) => ({ url: item.url, poster: item.poster }))
  );
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useClickOutside(formRef, () => {
    if (!uploading) onCancel();
  });

  const uploadMediaFiles = async (files: MediaFile[]) => {
    const uploads = await Promise.all(
      files.map(async (media) => {
        const up = await uploadToCloudinary(
          media.rawFile!,
          CLOUDINARY.folderPosts
        );
        let finalPoster = media.poster;
        if (finalPoster?.startsWith("data:")) {
          try {
            const posterRes = await uploadPosterDataUrl(finalPoster);
            finalPoster = posterRes.secure_url;
          } catch (err) {
            console.warn("Poster upload failed:", err);
          }
        }
        return { url: up.secure_url, poster: finalPoster };
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
    const processed: MediaFile[] = [];
    for (const file of files) {
      if (file.type === "image/heic" || /\.heic$/i.test(file.name)) {
        try {
          const blob = (await heic2any({
            blob: file,
            toType: "image/jpeg",
          })) as Blob;
          const jpeg = new File([blob], file.name.replace(/\.heic$/i, ".jpg"), {
            type: "image/jpeg",
          });
          const compressed = await compressImageToWebP(jpeg, MAX_IMG_DIM);
          processed.push({
            url: URL.createObjectURL(compressed),
            rawFile: compressed,
          });
        } catch (err) {
          console.error("HEIC conversion failed", err);
        }
        continue;
      }
      if (file.type.startsWith("image/")) {
        try {
          const compressed = await compressImageToWebP(file, MAX_IMG_DIM);
          processed.push({
            url: URL.createObjectURL(compressed),
            rawFile: compressed,
          });
        } catch {
          processed.push({ url: URL.createObjectURL(file), rawFile: file });
        }
        continue;
      }
      if (file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        let poster: string | undefined;
        try {
          poster = await makePosterFromVideo(url, MAX_POSTER_DIM);
        } catch {}
        processed.push({ url, rawFile: file, poster });
        continue;
      }
      processed.push({ url: URL.createObjectURL(file), rawFile: file });
    }
    setMediaFiles((prev) => [...prev, ...processed]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const newMedia = mediaFiles.filter((m) => m.rawFile);
      const existingMedia = mediaFiles.filter((m) => !m.rawFile);
      const uploads = await uploadMediaFiles(newMedia);
      const finalMedia = [...existingMedia, ...uploads];

      await editPost({
        postId: post._id,
        content,
        media: finalMedia,
      }).unwrap();

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
            placeholder="Beitrag bearbeiten..."
          />
          {mediaFiles.length > 0 && (
            <div className="media-preview-wrapper">
              <MediaPreviewCarousel
                mediaFiles={mediaFiles}
                onRemove={handleRemoveMedia}
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
