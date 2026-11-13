"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FadeInImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> & {
  priority?: boolean;
  fill?: boolean;
  fallbackSrc?: string;
  /** Extra classes for the <img> (e.g. object-contain). */
  imgClassName?: string;
  onLoad?: ImgHTMLAttributes<HTMLImageElement>["onLoad"];
  onError?: ImgHTMLAttributes<HTMLImageElement>["onError"];
};

export function FadeInImage({
  className,
  imgClassName,
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
      {!loaded && <div aria-hidden className="absolute inset-0 animate-pulse bg-muted" />}
      <img
        alt={alt ?? ""}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName,
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
