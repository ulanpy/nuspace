"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/utils/utils";

type FadeInImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> & {
  /** Eager + high priority for above-the-fold heroes */
  priority?: boolean;
  /** Fill a positioned parent (e.g. aspect-ratio poster frame) */
  fill?: boolean;
  /** Swap to this URL on error instead of unmounting */
  fallbackSrc?: string;
  onLoad?: ImgHTMLAttributes<HTMLImageElement>["onLoad"];
  onError?: ImgHTMLAttributes<HTMLImageElement>["onError"];
};

/**
 * Reserves layout, shows a pulse placeholder, then reveals the bitmap in one fade
 * once fully decoded — avoids progressive-JPEG "blinds" and empty holes.
 */
export function FadeInImage({
  className,
  priority = false,
  fill = false,
  fallbackSrc,
  onLoad,
  onError,
  alt,
  ...props
}: FadeInImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        fill ? "absolute inset-0 h-full w-full" : className,
      )}
    >
      {!loaded && (
        <div aria-hidden className="absolute inset-0 animate-pulse bg-muted" />
      )}
      <img
        alt={alt ?? ""}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300 ease-out",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          if (
            fallbackSrc &&
            e.currentTarget.src !== fallbackSrc &&
            !e.currentTarget.src.endsWith(fallbackSrc)
          ) {
            setLoaded(false);
            e.currentTarget.src = fallbackSrc;
            onError?.(e);
            return;
          }
          setFailed(true);
          onError?.(e);
        }}
        {...props}
      />
    </div>
  );
}
