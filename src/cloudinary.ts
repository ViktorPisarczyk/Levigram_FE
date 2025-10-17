export const isCloudinary = (url: string) => /res\.cloudinary\.com/.test(url);

// src/cloudinary.ts
export const CLOUDINARY = {
  cloudName: "dobaxwfhx", // aus deiner .env, aber hier fest eingetragen
  unsignedPreset: "levi_unsigned", // Name des in Cloudinary erstellten Presets
  folderPosts: "uploads/posts",
  folderPosters: "uploads/posts/posters",
};

function dataURLtoBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const bin = atob(data);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Generischer Upload (Bild/Video)
export async function uploadToCloudinary(file: File | Blob, folder: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY.unsignedPreset);
  fd.append("folder", folder);
  fd.append("use_filename", "true");
  fd.append("unique_filename", "true");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`,
    { method: "POST", body: fd }
  );
  const data = await res.json();
  if (!res.ok || !data.secure_url) {
    throw new Error(
      data.error?.message || data.message || "Cloudinary upload failed"
    );
  }
  return data as { secure_url: string; public_id: string; [k: string]: any };
}

// Poster-Upload aus DataURL
export async function uploadPosterDataUrl(dataUrl: string) {
  const blob = dataURLtoBlob(dataUrl);
  return uploadToCloudinary(blob as Blob, CLOUDINARY.folderPosters);
}

// (Optional) URL-Builder für Delivery-Optimierung
export function buildCloudinaryUrl(url: string, transforms: string): string {
  if (!/res\.cloudinary\.com/.test(url)) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/${transforms}/${parts[1]}`;
}
