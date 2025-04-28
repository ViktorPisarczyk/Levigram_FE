import React, { useState } from "react";
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

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: false,
    mode: "snap",
    slides: {
      perView: 1,
      spacing: 10,
    },
    slideChanged: (slider) => {
      setCurrentSlide(slider.track.details.rel);
    },
  });

  if (!media.length) return null;

  return (
    <div className="media-carousel">
      <div ref={sliderRef} className="keen-slider">
        {media.map((item, index) => {
          const isVideo = item?.url?.match(/\.(mp4|mov|webm|ogg)$/i);
          return (
            <div className="keen-slider__slide media-slide" key={index}>
              {isVideo ? (
                <video
                  src={item.url}
                  controls
                  className="post-media"
                  poster={item.poster}
                />
              ) : (
                <img
                  src={item.url}
                  alt={`media-${index}`}
                  className="post-media"
                />
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
