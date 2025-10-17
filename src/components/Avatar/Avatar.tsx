import React from "react";
import { buildCloudinaryUrl, isCloudinary } from "../../cloudinary";

type SizeToken = "sm" | "md" | "lg" | number;

export interface AvatarProps {
  src: string | undefined | null;
  alt?: string;
  size?: SizeToken; // px (number) oder "sm" | "md" | "lg"
  className?: string;
  title?: string;
  loading?: "eager" | "lazy";
}

const SIZE_MAP: Record<Exclude<SizeToken, number>, number> = {
  sm: 32,
  md: 40,
  lg: 56,
};

const pickSize = (size?: SizeToken) =>
  typeof size === "number" ? size : SIZE_MAP[size || "md"];

/**
 * Rundes Avatar-Bild mit:
 * - Cloudinary: f_auto,q_auto:eco,dpr_auto,c_thumb,r_max
 * - srcset für 1x/2x/3x
 * - Fallback für Nicht-Cloudinary-URLs
 */
const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "",
  size = "md",
  className = "",
  title,
  loading = "lazy",
}) => {
  const px = pickSize(size);
  const display = src || "/placeholder-avatar.png"; // Fallback

  if (!isCloudinary(display)) {
    // Nicht-Cloudinary: normales <img>, aber rund + object-fit
    return (
      <img
        src={display}
        alt={alt}
        title={title}
        loading={loading}
        decoding="async"
        width={px}
        height={px}
        className={`avatar ${className}`}
        style={{
          width: px,
          height: px,
          borderRadius: "9999px",
          objectFit: "cover",
          background: "#111",
          display: "inline-block",
        }}
      />
    );
  }

  // Cloudinary:
  const makeSrc = (w: number) =>
    buildCloudinaryUrl(
      display,
      `f_auto,q_auto:eco,dpr_auto,r_max,c_fit,w_${w},h_${w}`
    );

  const w1x = px;
  const w2x = px * 2;
  const w3x = px * 3;

  const srcSet = `${makeSrc(w1x)} ${w1x}w, ${makeSrc(w2x)} ${w2x}w, ${makeSrc(
    w3x
  )} ${w3x}w`;

  const sizes = `${px}px`;

  return (
    <img
      src={makeSrc(w2x)} // solide Default-Qualität
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      title={title}
      loading={loading}
      decoding="async"
      width={px}
      height={px}
      className={`avatar ${className}`}
      style={{
        width: px,
        height: px,
        borderRadius: "9999px",
        objectFit: "cover",
        background: "#111",
        display: "inline-block",
      }}
      onError={(e) => {
        // Fallback auf Original ohne Transforms
        const el = e.currentTarget;
        el.onerror = null;
        const split = el.src.split("/upload/");
        if (split.length === 2) {
          el.src = `${split[0]}/upload/${split[1].replace(/^([^/]+)\/+/, "")}`;
        } else {
          el.src = "/placeholder-avatar.png";
        }
      }}
    />
  );
};

export default Avatar;
