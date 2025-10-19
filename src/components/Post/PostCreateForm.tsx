import React, { useState, useRef, useEffect } from "react";
import heic2any from "heic2any";
import MediaPreviewCarousel from "../MediaPreviewCarousel/MediaPreviewCarousel";
import { useClickOutside } from "../../hooks/useClickOutside";
import "./PostCreateForm.scss";
import { useCreatePostMutation } from "../../redux/apiSlice";
import {
  uploadToCloudinary,
  uploadPosterDataUrl,
  CLOUDINARY,
} from "../../cloudinary";
import { useDispatch } from "react-redux";
import { postsApi } from "../../redux/apiSlice";

/* ---------------------------
   Props & lokale Typen
---------------------------- */
interface PostCreateFormProps {
  onClose: () => void;
  onPostCreated?: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

interface MediaFile {
  url: string;
  poster?: string;
  rawFile?: File;
}

/* ---------------------------
   Mobile-first Kompression
---------------------------- */
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
      } catch (e) {
        console.warn("Poster draw failed:", e);
        resolve(undefined);
      }
    };

    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", () => resolve(undefined), { once: true });
    video.load();
  });
}

const PostCreateForm: React.FC<PostCreateFormProps> = ({
  onClose,
  onPostCreated,
  triggerRef,
}) => {
  const [createPost, { isLoading: creating }] = useCreatePostMutation();
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();

  useClickOutside(
    formRef,
    () => {
      if (!uploading && !creating) {
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
    const root = document.documentElement;
    const textarea = formRef.current?.querySelector("textarea");
    if (!textarea) return;
    const handleFocus = () => root.classList.add("kb-open-any");
    const handleBlur = () => root.classList.remove("kb-open-any");
    textarea.addEventListener("focus", handleFocus);
    textarea.addEventListener("blur", handleBlur);
    return () => {
      textarea.removeEventListener("focus", handleFocus);
      textarea.removeEventListener("blur", handleBlur);
      root.classList.remove("kb-open-any");
    };
  }, []);

  /* ---------------------------
     Upload-Helfer (Cloudinary, unsigned)
  ---------------------------- */
  const uploadPosterImage = async (dataUrl: string): Promise<string> => {
    const res = await uploadPosterDataUrl(dataUrl);
    return res.secure_url;
  };

  const uploadMediaFiles = async (files: MediaFile[]) => {
    const filesWithRaw = files.filter((m) => !!m.rawFile);
    const uploads = await Promise.all(
      filesWithRaw.map(async (media) => {
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

    const passthrough = files
      .filter((m) => !m.rawFile)
      .map(({ url, poster }) => ({ url, poster }));
    return [...passthrough, ...uploads];
  };

  /* ---------------------------
     Auswahl & lokale Optimierung
  ---------------------------- */
  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const processedFiles: MediaFile[] = [];

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
          processedFiles.push({
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
          processedFiles.push({
            url: URL.createObjectURL(compressed),
            rawFile: compressed,
          });
        } catch (err) {
          console.error("Image compress failed:", err);
          processedFiles.push({
            url: URL.createObjectURL(file),
            rawFile: file,
          });
        }
        continue;
      }

      if (file.type.startsWith("video/")) {
        const blobUrl = URL.createObjectURL(file);
        let poster: string | undefined;
        try {
          poster = await makePosterFromVideo(blobUrl, MAX_POSTER_DIM);
        } catch (err) {
          console.error("Poster generation failed:", err);
        }
        processedFiles.push({ url: blobUrl, rawFile: file, poster });
        continue;
      }

      processedFiles.push({ url: URL.createObjectURL(file), rawFile: file });
    }

    setMediaFiles((prev) => [...prev, ...processedFiles]);
  };

  /* ---------------------------
     Absenden (RTK Query)
  ---------------------------- */
  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0) return;

    setUploading(true);
    try {
      const uploads = await uploadMediaFiles(mediaFiles);

      await createPost({ content, media: uploads }).unwrap();

      // Feed-Query invalidieren, damit der Feed neu geladen wird
      dispatch(postsApi.util.invalidateTags([{ type: "FeedPage", id: 1 }]));

      setContent("");
      setMediaFiles([]);
      if (onPostCreated) onPostCreated();
      onClose();
    } catch (err: any) {
      console.error("Upload/Create error:", err?.data || err?.message || err);
      alert(
        err?.data?.message ||
          err?.message ||
          "Post konnte nicht erstellt werden."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div ref={formRef} className="post-create-form dock-above-nav">
      <div className="form-content">
        <textarea
          placeholder="Schreibe etwas..."
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
                      (slider as any)?.keenSlider?.moveToIdx(
                        updated.length - 1
                      );
                    }, 0);
                  }
                  return updated;
                });
              }}
            />
          </div>
        )}

        <label htmlFor="media-upload" className="upload-button">
          Bilder/Videos hochladen
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
            disabled={uploading || creating}
            className="cancel-button"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || creating}
            className="submit-button"
          >
            Posten
          </button>
        </div>
      </div>

      {(uploading || creating) && (
        <div className="uploading-overlay">
          <div className="spinner" />
          <p className="loading-text">Beitrag wird hochgeladen...</p>
        </div>
      )}
    </div>
  );
};

export default PostCreateForm;
