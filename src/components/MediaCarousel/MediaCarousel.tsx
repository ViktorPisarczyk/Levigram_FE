import React, { useState, useEffect, useRef } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import "./MediaCarousel.scss";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

type PinchZoomProps = {
  src: string;
  alt: string;
  maxScale?: number;
};

const PinchZoom: React.FC<PinchZoomProps> = ({ src, alt, maxScale = 4 }) => {
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
    const was = pointers.current.get(e.pointerId)!;
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
    if (pointers.current.size < 2) {
      startDist.current = null;
    }
    if (pointers.current.size === 0) {
      lastPos.current = null;
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || true) {
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
      <img
        src={src}
        alt={alt}
        className="pz-media"
        draggable={false}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        }}
      />
      {scale > 1 && (
        <button
          className="pz-reset"
          onClick={reset}
          aria-label="Zoom zurücksetzen"
          title="Zurücksetzen"
        >
          Reset
        </button>
      )}
    </div>
  );
};

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

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: false,
    mode: "snap",
    slides: { perView: 1, spacing: 10 },
    slideChanged: (slider) => setCurrentSlide(slider.track.details.rel),
  });

  useEffect(() => {
    media.forEach((item) => {
      const isVideo = item.url.match(/\.(mp4|mov|webm|ogg)$/i);
      if (isVideo && !item.poster && !generatedPosters[item.url]) {
        const video = document.createElement("video");
        video.src = item.url;
        video.crossOrigin = "anonymous";
        video.preload = "metadata";

        video.addEventListener(
          "loadeddata",
          () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataURL = canvas.toDataURL("image/jpeg");
                setGeneratedPosters((prev) => ({
                  ...prev,
                  [item.url]: dataURL,
                }));
              }
            } catch (err) {
              console.error("Poster generation error:", err);
            }
          },
          { once: true }
        );

        video.addEventListener("error", () => {
          console.error("❌ Fehler beim Laden des Videos für Poster", item.url);
        });

        video.load();
      }
    });
  }, [media, generatedPosters]);

  useEffect(() => {
    if (playingIndex !== null) {
      const videoEl = videoRefs.current[playingIndex];
      if (videoEl) {
        videoEl
          .play()
          .then(() => console.log("▶️ Autoplay erfolgreich"))
          .catch((err) => console.warn("⚠️ Autoplay blockiert", err));
      }
    }
  }, [playingIndex]);

  const handlePlay = (index: number) => {
    setPlayingIndex(index);
  };

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

  const [galleryRef, galleryInstanceRef] = useKeenSlider<HTMLDivElement>({
    loop: false,
    mode: "free",
    initial: galleryInitial,
    slideChanged: (s) => setGalleryIndex(s.track.details.rel),
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

  const downloadImage = async (url: string, filename?: string) => {
    try {
      const res = await fetch(url, { credentials: "omit", mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename || url.split("/").pop() || "image";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        a.remove();
      }, 0);
    } catch (err) {
      console.error("Download fehlgeschlagen:", err);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (!media.length) return null;

  return (
    <div className="media-carousel">
      <div ref={sliderRef} className="keen-slider">
        {media.map((item, index) => {
          const isVideo = item.url.match(/\.(mp4|mov|webm|ogg)$/i);
          const poster = item.poster || generatedPosters[item.url];

          return (
            <div className="keen-slider__slide media-slide" key={index}>
              {isVideo ? (
                playingIndex === index ? (
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current[index] = el;
                    }}
                    src={item.url}
                    poster={poster}
                    controls
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                    className="post-media"
                  />
                ) : poster ? (
                  <div
                    className="video-poster"
                    style={{ backgroundImage: `url(${poster})` }}
                    onClick={() => handlePlay(index)}
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
                          fill="rgba(0, 0, 0, 0.5)"
                        />
                        <polygon points="40,30 70,50 40,70" fill="white" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="video-loading">Generating preview...</div>
                )
              ) : (
                <div className="image-wrapper">
                  <img
                    src={item.url}
                    alt={`media-${index}`}
                    className="post-media"
                    draggable={false}
                  />
                  <div className="image-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGallery(index);
                      }}
                      aria-label="Bild im Vollbild anzeigen"
                      title="Vollbild"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 9V3h6v2H5v4H3zm12-6h6v6h-2V5h-4V3zM3 15h2v4h4v2H3v-6zm16 0h2v6h-6v-2h4v-4z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const base = `levigram-${index + 1}`;
                        const ext = (item.url.split(".").pop() || "jpg").split(
                          "?"
                        )[0];
                        downloadImage(item.url, `${base}.${ext}`);
                      }}
                      aria-label="Bild herunterladen"
                      title="Download"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 20h14v-2H5v2zm7-18v12l5-5 1.41 1.41L12 18.83 6.59 12.41 8 11l4 4V2z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
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
              onClick={() => instanceRef.current?.moveToIdx(idx)}
              className={currentSlide === idx ? "dot active" : "dot"}
            />
          ))}
        </div>
      )}

      {isGalleryOpen && (
        <div className="gallery-modal" role="dialog" aria-modal="true">
          <div ref={galleryRef} className="keen-slider gallery-slider">
            {media.map((item, idx) => {
              const isVideo = item.url.match(/\.(mp4|mov|webm|ogg)$/i);
              return (
                <div
                  className="keen-slider__slide gallery-slide"
                  key={`g-${idx}`}
                >
                  {isVideo ? (
                    <video
                      src={item.url}
                      poster={item.poster || generatedPosters[item.url]}
                      controls
                      playsInline
                      preload="metadata"
                      className="gallery-media"
                    />
                  ) : (
                    <PinchZoom src={item.url} alt={`gallery-${idx}`} />
                  )}
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
            ✕
          </button>

          {media.length > 1 && (
            <>
              <button
                className="gallery-prev"
                onClick={() => galleryInstanceRef.current?.prev()}
                aria-label="Vorheriges"
                title="Zurück"
              >
                ‹
              </button>
              <button
                className="gallery-next"
                onClick={() => galleryInstanceRef.current?.next()}
                aria-label="Nächstes"
                title="Weiter"
              >
                ›
              </button>
            </>
          )}

          {!media[galleryIndex].url.match(/\.(mp4|mov|webm|ogg)$/i) && (
            <button
              className="gallery-download"
              onClick={() => {
                const url = media[galleryIndex].url;
                const base = `levigram-${galleryIndex + 1}`;
                const ext = (url.split(".").pop() || "jpg").split("?")[0];
                downloadImage(url, `${base}.${ext}`);
              }}
              aria-label="Bild herunterladen"
              title="Download"
            >
              ⬇
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaCarousel;
