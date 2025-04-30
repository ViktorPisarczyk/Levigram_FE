import React, { useState, useEffect } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import "./MediaPreviewCarousel.scss";

interface MediaFile {
  url: string;
  poster?: string;
  rawFile?: File;
}

interface Props {
  mediaFiles: MediaFile[];
  onRemove: (index: number) => void;
}

const MediaPreviewCarousel: React.FC<Props> = ({ mediaFiles, onRemove }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generatedPosters, setGeneratedPosters] = useState<{
    [url: string]: string;
  }>({});
  const [playStates, setPlayStates] = useState<{ [index: number]: boolean }>(
    {}
  );

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: false,
    slides: { perView: 1, spacing: 10 },
    slideChanged: (slider) => {
      setCurrentIndex(slider.track.details.rel);
    },
  });

  useEffect(() => {
    mediaFiles.forEach((file) => {
      const isVideo =
        file.rawFile?.type.startsWith("video/") ||
        file.url.match(/\.(mp4|mov|webm|ogg)$/i);
      if (isVideo && !file.poster && !generatedPosters[file.url]) {
        const video = document.createElement("video");
        video.src = file.url;
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
                  [file.url]: dataURL,
                }));
              }
            } catch (err) {
              console.error("❌ Poster-Generierung fehlgeschlagen:", err);
            }
          },
          { once: true }
        );

        video.addEventListener("error", () => {
          console.error("❌ Fehler beim Laden des Videos:", file.url);
        });

        video.load();
      }
    });
  }, [mediaFiles, generatedPosters]);

  const handlePlay = (index: number) => {
    setPlayStates((prev) => ({ ...prev, [index]: true }));
  };

  const handleRemove = (indexToRemove: number) => {
    const newMedia = [...mediaFiles];
    newMedia.splice(indexToRemove, 1);
    const newLength = newMedia.length;

    const newIndex =
      currentIndex >= newLength ? Math.max(0, newLength - 1) : currentIndex;

    onRemove(indexToRemove);

    requestAnimationFrame(() => {
      setCurrentIndex(newIndex);
      instanceRef.current?.moveToIdx(newIndex);
    });
  };

  useEffect(() => {
    instanceRef.current?.update();
  }, [mediaFiles.length]);

  return (
    <div className="media-carousel-preview">
      <div ref={sliderRef} className="keen-slider">
        {mediaFiles.map((file, index) => {
          const isVideo =
            file.rawFile?.type.startsWith("video/") ||
            file.url.match(/\.(mp4|mov|webm|ogg)$/i);
          const poster = file.poster || generatedPosters[file.url];

          return (
            <div key={index} className="keen-slider__slide media-slide">
              <button
                type="button"
                className="remove-button"
                onClick={() => handleRemove(index)}
              >
                ✖
              </button>

              {isVideo ? (
                playStates[index] ? (
                  <video
                    src={file.url}
                    controls
                    poster={poster}
                    className="preview-video"
                    preload="metadata"
                    playsInline
                    controlsList="nodownload"
                    crossOrigin="anonymous"
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
                  <div className="video-loading">Generating preview…</div>
                )
              ) : (
                <img
                  src={file.url}
                  alt={`preview-${index}`}
                  className="preview-image"
                />
              )}
            </div>
          );
        })}
      </div>

      {mediaFiles.length > 1 && (
        <div className="dots">
          {mediaFiles.map((_, idx) => (
            <button
              key={idx}
              onClick={() => instanceRef.current?.moveToIdx(idx)}
              className={`dot ${idx === currentIndex ? "active" : ""}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaPreviewCarousel;
