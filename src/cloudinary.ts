export const isCloudinary = (url: string) => /res\.cloudinary\.com/.test(url);

/**
 * Fügt Transformationen hinter /upload/ ein. Lässt fremde URLs unangetastet.
 */
export function buildCloudinaryUrl(url: string, transforms: string): string {
  if (!isCloudinary(url)) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/${transforms}/${parts[1]}`;
}
