export const isCloudinary = (url: string) => /res\.cloudinary\.com/.test(url);

export const CLOUDINARY = {
  cloudName: "dobaxwfhx",
  uploadPreset: "levi_unsigned",
  folderPosts: "uploads/posts",
  folderPosters: "uploads/posts/posters",
  folderProfiles: "uploads/profiles",
};

// Einfache Response-Typen
export type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  resource_type: "image" | "video" | "raw" | string;
  width?: number;
  height?: number;
  format?: string;
};

// Generische Upload-Funktion (auto = erkennt image/video)
export async function uploadToCloudinary(
  file: File,
  folder = CLOUDINARY.folderPosts
): Promise<CloudinaryUploadResponse> {
  const { cloudName, uploadPreset } = CLOUDINARY;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", uploadPreset);
  fd.append("folder", folder);
  fd.append("use_filename", "true");
  fd.append("unique_filename", "true");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    {
      method: "POST",
      body: fd,
    }
  );

  const data = await res.json();
  if (!res.ok || !data?.secure_url) {
    console.error("Cloudinary upload failed:", data);
    throw new Error(
      data?.error?.message || data?.message || `Upload failed (${res.status})`
    );
  }
  return data as CloudinaryUploadResponse;
}

// Poster-Upload aus dataURL (immer image/upload)
export async function uploadPosterDataUrl(
  dataUrl: string,
  folder = CLOUDINARY.folderPosters
): Promise<CloudinaryUploadResponse> {
  const { cloudName, uploadPreset } = CLOUDINARY;

  const fd = new FormData();
  fd.append("file", dataUrl);
  fd.append("upload_preset", uploadPreset);
  fd.append("folder", folder);
  fd.append("use_filename", "true");
  fd.append("unique_filename", "true");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: fd,
    }
  );

  const data = await res.json();
  if (!res.ok || !data?.secure_url) {
    console.error("Cloudinary poster upload failed:", data);
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `Poster upload failed (${res.status})`
    );
  }
  return data as CloudinaryUploadResponse;
}

// Optional: Delivery-URL Builder (Transformationen)
export function buildCloudinaryUrl(url: string, transforms: string): string {
  if (!/res\.cloudinary\.com/.test(url)) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  const base = parts[0];
  const rest = parts[1];
  return `${base}/upload/${transforms}/${rest}`;
}
