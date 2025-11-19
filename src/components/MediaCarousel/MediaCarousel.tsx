import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  memo,
} from "react";
import { buildCloudinaryUrl } from "../../cloudinary";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import "./MediaCarousel.scss";

/* ----------------------------------------
   OptimizedImage – mobile first
   - FEED: genau 500x360 (c_fit) – klein & konsistent
   - GALLERY: max ~1200px (contain)
---------------------------------------- */
type ImgContext = "feed" | "gallery";
type OptimizedImageProps = {
  url: string;
  alt: string;
  context: "feed" | "gallery";
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

const FEED_W = 500;
const FEED_H = 360;
const GALLERY_W = 1200;

export const OptimizedImage = memo(function OptimizedImage({
  url,
  alt,
  context,
  priority = false,
  className,
  style,
}: OptimizedImageProps) {
  const isCloudinary = /res\.cloudinary\.com/.test(url);

  const feedSrc = isCloudinary
    ? buildCloudinaryUrl(
        url,
        `f_auto,q_auto:good,dpr_auto,c_fit,w_${FEED_W},h_${FEED_H}`
      )
    : url;

  const gallerySrc = isCloudinary
    ? buildCloudinaryUrl(
        url,
        `f_auto,q_auto:good,dpr_auto,c_limit,w_${GALLERY_W}`
      )
    : url;

  const gallerySrcSet = isCloudinary
    ? [
        buildCloudinaryUrl(url, `f_auto,q_auto:good,dpr_auto,c_limit,w_900`) +
          " 900w",
        buildCloudinaryUrl(url, `f_auto,q_auto:good,dpr_auto,c_limit,w_1200`) +
          " 1200w",
      ].join(", ")
    : undefined;

  const common: Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    "src" | "srcSet" | "sizes"
  > = {
    alt,
    loading: priority ? "eager" : "lazy",
    decoding: "async",
    fetchPriority: priority ? "high" : "low",
    className,
    style: {
      display: "block",
      width: "100%",
      height: "100%",
      objectFit: context === "feed" ? "cover" : "contain",
      background: "#000",
      ...style,
    },
    onError: (e) => {
      const el = e.currentTarget;
      el.onerror = null;
      const split = el.src.split("/upload/");
      if (split.length === 2) {
        el.src = `${split[0]}/upload/${split[1].replace(/^([^/]+)\/+/, "")}`;
      } else {
        el.src = "/placeholder.jpg";
      }
    },
  };

  if (context === "feed") {
    return <img src={feedSrc} {...common} />;
  }

  return (
    <img src={gallerySrc} srcSet={gallerySrcSet} sizes="100vw" {...common} />
  );
});

/* ----------------------------------------
   PinchZoom für Gallery
---------------------------------------- */
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

type PinchZoomProps = {
  src: string;
  alt: string;
  maxScale?: number;
};

export type PinchZoomHandle = { reset: () => void };

const PinchZoom = forwardRef<PinchZoomHandle, PinchZoomProps>(
  ({ src, alt, maxScale = 4 }, ref) => {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [scale, setScale] = useState(1);
    const [tx, setTx] = useState(0);
    const [ty, setTy] = useState(0);
    const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
    const startDist = useRef<number | null>(null);
    const startScale = useRef(1);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    const clampTranslate = (nx: number, ny: number) => {
      const el = wrapRef.current;
      if (!el) return { x: nx, y: ny };
      const rect = el.getBoundingClientRect();
      const maxX = ((scale - 1) * rect.width) / 2;
      const maxY = ((scale - 1) * rect.height) / 2;
      return { x: clamp(nx, -maxX, maxX), y: clamp(ny, -maxY, maxY) };
    };

    const reset = () => {
      setScale(1);
      setTx(0);
      setTy(0);
    };

    useImperativeHandle(ref, () => ({ reset }), []);

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (scale > 1) e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 1) {
        lastPos.current = { x: e.clientX, y: e.clientY };
      } else if (pointers.current.size === 2) {
        const arr = Array.from(pointers.current.values());
        const dx = arr[0].x - arr[1].x;
        const dy = arr[0].y - arr[1].y;
        startDist.current = Math.hypot(dx, dy);
        startScale.current = scale;
      }
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 1 && scale > 1 && lastPos.current) {
        e.stopPropagation();
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        const clamped = clampTranslate(tx + dx, ty + dy);
        setTx(clamped.x);
        setTy(clamped.y);
        lastPos.current = { x: e.clientX, y: e.clientY };
      }

      if (pointers.current.size === 2 && startDist.current) {
        e.preventDefault();
        e.stopPropagation();
        const arr = Array.from(pointers.current.values());
        const dx = arr[0].x - arr[1].x;
        const dy = arr[0].y - arr[1].y;
        const dist = Math.hypot(dx, dy);
        const next = clamp(
          (startScale.current * dist) / startDist.current,
          1,
          maxScale
        );
        if (next === 1) {
          setScale(1);
          setTx(0);
          setTy(0);
        } else {
          setScale(next);
          const clamped = clampTranslate(tx, ty);
          setTx(clamped.x);
          setTy(clamped.y);
        }
      }
    };

    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) startDist.current = null;
      if (pointers.current.size === 0) lastPos.current = null;
    };

    const onWheel = (e: React.WheelEvent) => {
      if (!e.ctrlKey && scale === 1) return;
      e.preventDefault();
      const delta = -e.deltaY;
      const step = delta > 0 ? 0.1 : -0.1;
      const next = clamp(scale + step, 1, maxScale);
      setScale(next);
      if (next === 1) {
        setTx(0);
        setTy(0);
      } else {
        const clamped = clampTranslate(tx, ty);
        setTx(clamped.x);
        setTy(clamped.y);
      }
    };

    const onDoubleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (scale === 1) setScale(2);
      else reset();
    };

    return (
      <div
        ref={wrapRef}
        className={`pz-wrap ${scale > 1 ? "pz-zoomed" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        style={{ touchAction: scale > 1 ? "none" : "pan-y" }}
      >
        <OptimizedImage
          url={src}
          alt={alt}
          context="gallery"
          priority={false}
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "center center",
            willChange: "transform",
            touchAction: scale > 1 ? "none" : "pan-y",
          }}
        />
        {scale > 1 && (
          <button
            className="pz-reset"
            onClick={reset}
            aria-label="Zoom zurücksetzen"
          >
            Reset
          </button>
        )}
      </div>
    );
  }
);
PinchZoom.displayName = "PinchZoom";

/* ----------------------------------------
   Component
---------------------------------------- */
interface MediaItem {
  url: string;
  poster?: string;
}

interface MediaCarouselProps {
  media: MediaItem[];
}

const MediaCarousel: React.FC<MediaCarouselProps> = ({ media }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [generatedPosters, setGeneratedPosters] = useState<{
    [url: string]: string;
  }>({});
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryInitial, setGalleryInitial] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const pinchRefs = useRef<(PinchZoomHandle | null)[]>([]);

  const isUiOverlayOpen = () =>
    document.documentElement.classList.contains("ui-overlay-open");

  // Keen slider (Feed)
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: false,
    mode: "snap",
    slides: { perView: 1, spacing: 10 },
    slideChanged: (slider) => setCurrentSlide(slider.track.details.rel),
  });

  // Video-Poster klein halten (Bandbreite!)
  useEffect(() => {
    media.forEach((item) => {
      const isVideo = item.url.match(/\.(mp4|mov|webm|ogg)$/i);
      if (isVideo && !item.poster && !generatedPosters[item.url]) {
        const video = document.createElement("video");
        video.src = item.url;
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;

        const onLoaded = () => {
          try {
            const vw = video.videoWidth || 1280;
            const vh = video.videoHeight || 720;
            const max = 720;
            const ratio = vw / vh;
            const w = vw > vh ? max : Math.round(max * ratio);
            const h = vw > vh ? Math.round(max / ratio) : max;
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, w, h);
              const dataURL = canvas.toDataURL("image/webp", 0.6);
              setGeneratedPosters((prev) => ({ ...prev, [item.url]: dataURL }));
            }
          } catch (err) {
            console.error("Poster generation error:", err);
          }
        };

        video.addEventListener("loadeddata", onLoaded, { once: true });
        video.addEventListener("error", () =>
          console.error("❌ Fehler beim Laden des Videos für Poster", item.url)
        );
        video.load();
      }
    });
  }, [media, generatedPosters]);

  // Autoplay nur wenn explizit gewählt
  useEffect(() => {
    if (playingIndex !== null) {
      const videoEl = videoRefs.current[playingIndex];
      if (videoEl) {
        videoEl
          .play()
          .catch((err) => console.warn("⚠️ Autoplay blockiert", err));
      }
    }
  }, [playingIndex]);

  const handlePlay = (index: number) => setPlayingIndex(index);

  const openGallery = (index: number) => {
    setGalleryInitial(index);
    setGalleryIndex(index);
    setIsGalleryOpen(true);
  };
  const closeGallery = () => setIsGalleryOpen(false);

  useEffect(() => {
    if (isGalleryOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isGalleryOpen]);

  // Keen slider (Gallery)
  const [galleryRef, galleryInstanceRef] = useKeenSlider<HTMLDivElement>({
    loop: false,
    mode: "snap",
    initial: galleryInitial,
    renderMode: "precision",
    slides: { perView: 1, spacing: 0 },
    rubberband: false as any,
    drag: true,
    slideChanged: (s) => {
      setGalleryIndex(s.track.details.rel);
      pinchRefs.current.forEach((r) => r?.reset());
    },
  });

  useEffect(() => {
    if (!isGalleryOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeGallery();
      if (e.key === "ArrowRight") galleryInstanceRef.current?.next();
      if (e.key === "ArrowLeft") galleryInstanceRef.current?.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isGalleryOpen, galleryInstanceRef]);

  // Download helper
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string, ms = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  const downloadImage = async (url: string, filename?: string) => {
    try {
      // Prefer file-based sharing when the platform supports it. On iOS
      // sharing an actual File produces the native "Save Image" / "Save Video"
      // option. If that isn't available, fall back to sharing the URL, then
      // finally to a blob+anchor download.
      const isFileLike = /\.(mp4|mov|webm|ogg|jpg|jpeg|png|webp)$/i.test(url);

      // 1) Try file-based share first when reasonable
      if (
        isFileLike &&
        (navigator as any).canShare &&
        typeof (navigator as any).canShare === "function"
      ) {
        try {
          const res = await fetch(url, { credentials: "omit", mode: "cors" });
          if (res.ok) {
            const blob = await res.blob();
            const file = new File(
              [blob],
              filename || url.split("/").pop() || "media",
              { type: blob.type }
            );
            if ((navigator as any).canShare({ files: [file] })) {
              await (navigator as any).share({
                files: [file],
                title: filename || undefined,
              });
              showToast("Teilen/Herunterladen gestartet");
              return;
            }
          }
        } catch (err) {
          console.warn("File-based share failed, falling back:", err);
          // don't return here — try other fallbacks below
        }
      }

      // 2) Try a simple URL share (lighter-weight). If the user cancels the
      // share dialog, stop and don't continue to open anything.
      if (typeof navigator.share === "function") {
        try {
          await (navigator as any).share({ url, title: filename || undefined });
          showToast("Teilen/Herunterladen gestartet");
          return;
        } catch (err) {
          const name = (err && (err as any).name) || "";
          if (name === "AbortError" || name === "NotAllowedError") {
            // User cancelled — stop silently.
            return;
          }
          // otherwise continue to fallback
          console.warn("URL share failed, falling back to blob download:", err);
        }
      }

      // 3) Final fallback: download via blob+anchor
      const res = await fetch(url, { credentials: "omit", mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename || url.split("/").pop() || "media";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        a.remove();
      }, 1500);
      showToast("Download gestartet");
    } catch (err) {
      console.error("Download fehlgeschlagen:", err);
      showToast("Download fehlgeschlagen");
      // Don't open the media URL in a new tab on error (iOS will show a preview page
      // when the user dismisses the share dialog). Just show feedback and stop.
      return;
    }
  };

  if (!media.length) return null;

  // Nur aktuelle & Nachbarn wirklich rendern (Feed)
  const shouldMountFeed = (idx: number) =>
    Math.abs(idx - currentSlide) <= 1 && !isGalleryOpen;

  // In Gallery nur aktuellen & Nachbarn montieren
  const shouldMountGallery = (idx: number) => Math.abs(idx - galleryIndex) <= 1;

  return (
    <div className="media-carousel">
      <div ref={sliderRef} className="keen-slider">
        {media.map((item, index) => {
          const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(item.url);
          const poster = item.poster || generatedPosters[item.url];

          return (
            <div className="keen-slider__slide media-slide" key={index}>
              {shouldMountFeed(index) ? (
                isVideo ? (
                  // Video erst beim Klick laden (preload=none)
                  playingIndex === index ? (
                    <div className="video-wrapper">
                      <video
                        ref={(el) => {
                          if (el) videoRefs.current[index] = el;
                        }}
                        src={item.url}
                        poster={poster}
                        controls
                        playsInline
                        preload="none"
                        className="post-media"
                      />
                      <div
                        className="image-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => {
                            const base = `levigram-${index + 1}`;
                            const ext = (
                              item.url.split(".").pop() || "mp4"
                            ).split("?")[0];
                            downloadImage(item.url, `${base}.${ext}`);
                          }}
                          aria-label="Video herunterladen"
                          title="Download"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isUiOverlayOpen()) return;
                            openGallery(index);
                          }}
                          aria-label="Video im Vollbild anzeigen"
                          title="Vollbild"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="21" y1="3" x2="14" y2="10"></line>
                            <polyline points="9 21 3 21 3 15"></polyline>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : poster ? (
                    <div
                      className="video-poster"
                      style={{ backgroundImage: `url(${poster})` }}
                      onClick={() => {
                        if (isUiOverlayOpen()) return;
                        handlePlay(index);
                      }}
                    >
                      <div className="play-button">
                        <svg
                          viewBox="0 0 100 100"
                          className="play-icon"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="48"
                            fill="rgba(0,0,0,0.5)"
                          />
                          <polygon points="40,30 70,50 40,70" fill="white" />
                        </svg>
                      </div>
                      <div
                        className="image-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => {
                            const base = `levigram-${index + 1}`;
                            const ext = (
                              item.url.split(".").pop() || "mp4"
                            ).split("?")[0];
                            downloadImage(item.url, `${base}.${ext}`);
                          }}
                          aria-label="Video herunterladen"
                          title="Download"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isUiOverlayOpen()) return;
                            openGallery(index);
                          }}
                          aria-label="Video im Vollbild anzeigen"
                          title="Vollbild"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="21" y1="3" x2="14" y2="10"></line>
                            <polyline points="9 21 3 21 3 15"></polyline>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="video-loading">Generating preview...</div>
                  )
                ) : (
                  <div
                    className="image-wrapper"
                    onClick={() => {
                      if (isUiOverlayOpen()) return;
                      openGallery(index);
                    }}
                  >
                    <OptimizedImage
                      url={item.url}
                      alt={`media-${index}`}
                      context="feed"
                      priority={index === 0}
                    />
                    <div
                      className="image-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => {
                          const base = `levigram-${index + 1}`;
                          const ext = (
                            item.url.split(".").pop() || "jpg"
                          ).split("?")[0];
                          downloadImage(item.url, `${base}.${ext}`);
                        }}
                        aria-label="Bild herunterladen"
                        title="Download"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isUiOverlayOpen()) return;
                          openGallery(index);
                        }}
                        aria-label="Bild im Vollbild anzeigen"
                        title="Vollbild"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="21" y1="3" x2="14" y2="10"></line>
                          <polyline points="9 21 3 21 3 15"></polyline>
                          <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              ) : (
                // Placeholder statt offscreen Media
                <div className="media-skeleton" />
              )}
            </div>
          );
        })}
      </div>

      {media.length > 1 && (
        <div className="dots">
          {media.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (isUiOverlayOpen()) return;
                instanceRef.current?.moveToIdx(idx);
              }}
              className={currentSlide === idx ? "dot active" : "dot"}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* GALLERY (Full View) */}
      {isGalleryOpen && (
        <div className="gallery-modal" role="dialog" aria-modal="true">
          <div ref={galleryRef} className="keen-slider gallery-slider">
            {media.map((item, idx) => {
              const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(item.url);
              const mount = shouldMountGallery(idx);
              return (
                <div
                  className="keen-slider__slide gallery-slide"
                  key={`g-${idx}`}
                >
                  <div className="gallery-frame">
                    {!mount ? (
                      <div className="media-skeleton" />
                    ) : isVideo ? (
                      <video
                        src={item.url}
                        poster={item.poster || generatedPosters[item.url]}
                        controls
                        playsInline
                        preload="metadata"
                        className="gallery-media"
                      />
                    ) : (
                      <PinchZoom
                        ref={(el) => {
                          pinchRefs.current[idx] = el;
                        }}
                        src={item.url}
                        alt={`gallery-${idx}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="gallery-close"
            onClick={closeGallery}
            aria-label="Schließen"
            title="Schließen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <button
            className="gallery-download"
            onClick={() => {
              const url = media[galleryIndex].url;
              const base = `levigram-${galleryIndex + 1}`;
              const ext = (
                url.split(".").pop() ||
                (/(mp4|mov|webm|ogg)$/i.test(url) ? "mp4" : "jpg")
              ).split("?")[0];
              downloadImage(url, `${base}.${ext}`);
            }}
            aria-label="Medien herunterladen"
            title="Download"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>

          {media.length > 1 && (
            <div className="gallery-dots">
              {media.map((_, idx) => (
                <button
                  key={`gdot-${idx}`}
                  onClick={() => galleryInstanceRef.current?.moveToIdx(idx)}
                  className={
                    galleryIndex === idx ? "gallery-dot active" : "gallery-dot"
                  }
                  aria-label={`Bild ${idx + 1} von ${media.length}`}
                  title={`Bild ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {/* gallery-dots are rendered inside the modal only; do not render a second
      copy here (it previously leaked into the bottom navigation) */}
      {toast && <div className="mc-toast">{toast}</div>}
    </div>
  );
};

export default MediaCarousel;
