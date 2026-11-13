"use client";

import { Calendar, Users } from "lucide-react";
import { FadeInImage } from "@/components/shared/fade-in-image";
import { cn } from "@/lib/utils";

type AnnouncementEventPosterProps = {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  fallback?: "calendar" | "users";
  /** contain keeps the full poster readable; cover crops to fill */
  fit?: "contain" | "cover";
};

export function AnnouncementEventPoster({
  src,
  alt,
  className,
  priority = false,
  fallback = "calendar",
  fit = "cover",
}: AnnouncementEventPosterProps) {
  const FallbackIcon = fallback === "users" ? Users : Calendar;

  return (
    <div
      className={cn(
        "relative aspect-[3/4] flex-shrink-0 overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      {src ? (
        <FadeInImage
          src={src}
          alt={alt}
          fill
          priority={priority}
          className="absolute inset-0 size-full"
          imgClassName={cn(
            "size-full",
            fit === "contain" ? "object-contain" : "object-cover object-center",
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10">
          <FallbackIcon className="h-1/3 w-1/3 text-primary opacity-70" />
        </div>
      )}
    </div>
  );
}
