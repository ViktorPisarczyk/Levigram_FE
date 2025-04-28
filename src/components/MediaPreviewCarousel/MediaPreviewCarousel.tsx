import React, { useState, useEffect, useMemo } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import "./MediaPreviewCarousel.scss";

interface Props {
  mediaFiles: (File | string)[];
  onRemove: (index: number) => void;
}

const MediaPreviewCarousel: React.FC<Props> = ({ mediaFiles, onRemove }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: false,
    slides: { perView: 1, spacing: 10 },
    slideChanged(slider) {
      setCurrentIndex(slider.track.details.rel);
    },
  });

  useEffect(() => {
    const urls = mediaFiles.map((file) =>
      typeof file === "string" ? file : URL.createObjectURL(file)
    );
    setObjectUrls(urls);

    return () => {
      urls.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [mediaFiles]);

  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.update();
      if (currentIndex >= mediaFiles.length) {
        const newIndex = Math.max(0, mediaFiles.length - 1);
        setCurrentIndex(newIndex);
        instanceRef.current.moveToIdx(newIndex);
      }
    }
  }, [mediaFiles.length, instanceRef, currentIndex]);

  const isImage = (url: string) => {
    return !url.match(/\.(mp4|mov|webm|ogg)$/i);
  };

  if (!objectUrls.length) return null;

  return (
    <div className="media-carousel-preview">
      <div ref={sliderRef} className="keen-slider">
        {objectUrls.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="keen-slider__slide media-slide"
          >
            <button
              type="button"
              className="remove-button"
              onClick={() => onRemove(index)}
            >
              ✖
            </button>
            {isImage(url) ? (
              <img src={url} alt={`preview-${index}`} />
            ) : (
              <video controls src={url} preload="metadata" />
            )}
          </div>
        ))}
      </div>

      {objectUrls.length > 1 && (
        <div className="dots">
          {objectUrls.map((_, idx) => (
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
