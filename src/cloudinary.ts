export const isCloudinary = (url: string) => /res\.cloudinary\.com/.test(url);

export const CLOUDINARY = {
  cloudName: (import.meta as any).env?.VITE_CLOUDINARY_NAME || "dobaxwfhx",
  uploadPreset:
    (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || "levi_unsigned",
  folderPosts: "uploads/posts",
  folderPosters: "uploads/posts/posters",
  folderProfiles: "uploads/profiles",
};

// -------- Upload: File (Bild/Video) --------
export async function uploadToCloudinary(file: File, folder: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY.uploadPreset);
  fd.append("folder", folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`;
  const res = await fetch(endpoint, { method: "POST", body: fd });
  const data = await res.json();

  if (!res.ok || !data.secure_url) {
    throw new Error(
      data.error?.message || data.message || "Cloudinary upload failed"
    );
  }
  return data as {
    secure_url: string;
    public_id: string;
    resource_type: "image" | "video" | "raw";
    [key: string]: any;
  };
}

// -------- Upload: Poster (DataURL) --------
export async function uploadPosterDataUrl(dataUrl: string) {
  const fd = new FormData();
  fd.append("file", dataUrl);
  fd.append("upload_preset", CLOUDINARY.uploadPreset);
  fd.append("folder", CLOUDINARY.folderPosters);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;
  const res = await fetch(endpoint, { method: "POST", body: fd });
  const data = await res.json();

  if (!res.ok || !data.secure_url) {
    throw new Error(
      data.error?.message || data.message || "Cloudinary poster upload failed"
    );
  }
  return data as { secure_url: string; public_id: string; [key: string]: any };
}

// -------- Delivery Helper (Transform-URL bauen) --------
export function buildCloudinaryUrl(url: string, transforms: string): string {
  if (!/res\.cloudinary\.com/.test(url)) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/${transforms}/${parts[1]}`;
}
