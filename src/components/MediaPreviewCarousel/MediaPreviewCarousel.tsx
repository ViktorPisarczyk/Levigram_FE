import React, { useState, useMemo } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import "./MediaPreviewCarousel.scss";

interface MediaFile {
  url: string;
  poster?: string;
}

interface Props {
  mediaFiles: MediaFile[];
  onRemove: (index: number) => void;
}

const MediaPreviewCarousel: React.FC<Props> = ({ mediaFiles, onRemove }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: false,
    slides: {
      perView: 1,
      spacing: 10,
    },
    slideChanged: (slider) => {
      setCurrentIndex(slider.track.details.rel);
    },
  });

  if (!mediaFiles.length) return null;

  return (
    <div className="media-carousel-preview">
      <div ref={sliderRef} className="keen-slider">
        {mediaFiles.map((file, index) => {
          const isVideo = file.url.match(/\.(mp4|mov|webm|ogg)$/i);
          return (
            <div key={index} className="keen-slider__slide media-slide">
              <button
                type="button"
                className="remove-button"
                onClick={() => onRemove(index)}
              >
                ✖
              </button>
              {isVideo ? (
                <video
                  src={file.url}
                  controls
                  poster={file.poster || undefined}
                  className="preview-video"
                />
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
