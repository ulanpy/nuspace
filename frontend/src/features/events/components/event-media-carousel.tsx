"use client";

import { useEffect, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Media } from "@/features/media/types/types";

type EventMediaCarouselProps = {
  media: Media[];
  eventName: string;
};

export function EventMediaCarousel({ media, eventName }: EventMediaCarouselProps) {
  const images = [...media].sort((left, right) => left.media_order - right.media_order).slice(0, 5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImageIds, setFailedImageIds] = useState<number[]>([]);

  useEffect(() => {
    setCurrentIndex(0);
    setFailedImageIds([]);
  }, [media]);

  if (images.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <div className="text-center">
          <Calendar className="mx-auto mb-2 h-16 w-16 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No poster available</p>
        </div>
      </div>
    );
  }

  const currentImage = images[Math.min(currentIndex, images.length - 1)];
  const hasMultipleImages = images.length > 1;
  const imageFailed = failedImageIds.includes(currentImage.id);
  const previous = () => setCurrentIndex((index) => (index - 1 + images.length) % images.length);
  const next = () => setCurrentIndex((index) => (index + 1) % images.length);

  return (
    <div className="flex h-full w-full flex-col bg-muted">
      <div className="relative min-h-0 flex-1">
        {imageFailed ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Poster could not be loaded
          </div>
        ) : (
          <img
            src={currentImage.url || "/placeholder.svg"}
            alt={`${eventName} poster ${currentIndex + 1}`}
            className="h-full w-full object-contain object-center"
            onError={() => setFailedImageIds((ids) => [...new Set([...ids, currentImage.id])])}
            loading="lazy"
          />
        )}

        {hasMultipleImages && (
          <>
            <Button
              aria-label="Previous poster"
              className="absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full p-0"
              onClick={previous}
              size="icon"
              type="button"
              variant="secondary"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              aria-label="Next poster"
              className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full p-0"
              onClick={next}
              size="icon"
              type="button"
              variant="secondary"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
              {currentIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {hasMultipleImages && (
        <div className="grid grid-cols-5 gap-1 border-t bg-background/80 p-1.5">
          {images.map((image, index) => (
            <button
              aria-label={`Show poster ${index + 1}`}
              className={`aspect-[3/4] overflow-hidden rounded border-2 ${
                index === currentIndex ? "border-primary" : "border-transparent"
              }`}
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              type="button"
            >
              <img
                alt=""
                className="h-full w-full object-cover"
                src={image.url || "/placeholder.svg"}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
