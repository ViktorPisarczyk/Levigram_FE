import React, { useState } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import "./MediaCarousel.scss";

interface MediaCarouselProps {
  media: string[];
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

  return (
    <div className="media-carousel">
      <div ref={sliderRef} className="keen-slider">
        {media.map((item, index) => {
          const isVideo = item.match(/\.(mp4|mov|webm|ogg)$/i);
          return (
            <div className="keen-slider__slide media-slide" key={index}>
              {isVideo ? (
                <video src={item} controls className="post-media" />
              ) : (
                <img src={item} alt={`media-${index}`} className="post-media" />
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
