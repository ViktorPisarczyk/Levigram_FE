import React, { useState, useEffect, useRef } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import "./MediaCarousel.scss";

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

  const imageRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  /** Fullscreen-Helper */
  const enterFullscreen = async (index: number) => {
    const el = imageRefs.current[index];
    if (!el) return;
    const anyEl = el as any;
    try {
      if (anyEl.requestFullscreen) await anyEl.requestFullscreen();
      else if (anyEl.webkitRequestFullscreen) anyEl.webkitRequestFullscreen();
      else if (anyEl.msRequestFullscreen) anyEl.msRequestFullscreen();
    } catch (e) {
      console.warn("Fullscreen nicht möglich:", e);
    }
  };

  /** Cloudinary-Download */
  const asAttachment = (url: string, filename?: string) => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/upload/");
      if (parts.length === 2) {
        const name = filename ? `fl_attachment:${filename}` : "fl_attachment";
        u.pathname = `${parts[0]}/upload/${name}/${parts[1]}`;
        return u.toString();
      }
      u.searchParams.set("download", "true"); // Fallback
      return u.toString();
    } catch {
      return url;
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
                /** Fullscreen + Download */
                <div
                  className="image-wrapper"
                  ref={(el) => {
                    imageRefs.current[index] = el;
                  }}
                >
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
                        enterFullscreen(index);
                      }}
                      aria-label="Bild im Vollbild anzeigen"
                      title="Vollbild"
                    >
                      {/* Fullscreen-Icon (inline SVG) */}
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

                    <a
                      className="icon-btn"
                      href={asAttachment(item.url, `levigram-${index + 1}.jpg`)}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Bild herunterladen"
                      title="Download"
                    >
                      {/* Download-Icon (inline SVG) */}
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
                    </a>
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
    </div>
  );
};

export default MediaCarousel;
