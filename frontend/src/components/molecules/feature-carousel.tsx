"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StaticImageData } from "@/router/image";

interface FeatureCarouselProps {
  images: StaticImageData[];
  alt: string;
}

const getSrc = (image: string | StaticImageData): string =>
  typeof image === "string" ? image : image.src;

export function FeatureCarousel({ images, alt }: FeatureCarouselProps) {
  const [index, setIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const showPrevious = () => {
    setIndex((currentIndex) =>
      currentIndex === 0 ? images.length - 1 : currentIndex - 1,
    );
  };

  const showNext = () => {
    setIndex((currentIndex) => (currentIndex + 1) % images.length);
  };

  useEffect(() => {
    images.forEach((image) => {
      const preloadImage = new Image();
      preloadImage.src = getSrc(image);
    });
  }, [images]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((currentIndex) => (currentIndex + 1) % images.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [images.length]);

  return (
    <div
      className="group relative h-full w-full overflow-hidden rounded-lg"
      role="region"
      aria-label="Campus event photos"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.img
          key={index}
          src={getSrc(images[index])}
          alt={alt + ", photo " + (index + 1) + " of " + images.length}
          className="absolute inset-0 h-full w-full object-cover"
          initial={prefersReducedMotion ? { opacity: 0 } : { x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { x: "-100%" }}
          transition={{
            x: {
              type: "tween",
              duration: 0.22,
              ease: [0.16, 1, 0.3, 1],
            },
            opacity: { duration: 0.18 },
          }}
        />
      </AnimatePresence>

      <div
        className="pointer-events-none absolute inset-0 bg-foreground/10"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={showPrevious}
        className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-50/60 bg-slate-950/80 text-slate-50 opacity-0 shadow-md backdrop-blur-sm transition-[opacity,background-color] hover:bg-slate-950 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label="Previous event photo"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={showNext}
        className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-50/60 bg-slate-950/80 text-slate-50 opacity-0 shadow-md backdrop-blur-sm transition-[opacity,background-color] hover:bg-slate-950 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label="Next event photo"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
