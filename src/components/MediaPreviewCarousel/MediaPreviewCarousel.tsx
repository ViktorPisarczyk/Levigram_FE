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

  const urls = useMemo(() => {
    return mediaFiles.map((item) =>
      typeof item === "string" ? item : URL.createObjectURL(item)
    );
  }, [mediaFiles]);

  useEffect(() => {
    return () => {
      mediaFiles.forEach((item) => {
        if (item instanceof File) {
          try {
            URL.revokeObjectURL(URL.createObjectURL(item));
          } catch (err) {
            console.warn("Revoke failed", err);
          }
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

  const isImage = (item: File | string) =>
    typeof item === "string"
      ? !item.match(/\.(mp4|mov|webm|ogg)$/i)
      : item.type.startsWith("image");

  if (!urls.length) return null;

  return (
    <div className="media-carousel-preview">
      <div ref={sliderRef} className="keen-slider" key={mediaFiles.length}>
        {mediaFiles.map((file, index) => (
          <div key={index} className="keen-slider__slide media-slide">
            <button
              type="button"
              className="remove-button"
              onClick={() => onRemove(index)}
            >
              ✖
            </button>
            {isImage(file) ? (
              <img src={urls[index]} alt={`preview-${index}`} />
            ) : (
              <video controls src={urls[index]} />
            )}
          </div>
        ))}
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
