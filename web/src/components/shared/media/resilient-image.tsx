import { useEffect, useState } from "react"
import { ImageOffIcon } from "lucide-react"
import type { ImgHTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

interface ResilientImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> {
  src?: string | null
  alt: string
  containerClassName?: string
  eager?: boolean
  fallback?: ReactNode
}

export function ResilientImage({
  src,
  alt,
  className,
  containerClassName,
  eager = false,
  fallback,
  onError,
  onLoad,
  ...props
}: ResilientImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    src ? "loading" : "error"
  )

  useEffect(() => {
    setStatus(src ? "loading" : "error")
  }, [src])

  return (
    <span
      className={cn(
        "relative block overflow-hidden bg-muted",
        containerClassName
      )}
    >
      {status === "loading" && (
        <span className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      )}

      {status === "error" ? (
        (fallback ?? (
          <span className="flex size-full min-h-24 flex-col items-center justify-center gap-2 bg-muted p-4 text-center text-xs text-muted-foreground">
            <ImageOffIcon className="size-6" aria-hidden />
            <span>
              {alt ? `${alt}: image unavailable` : "Image unavailable"}
            </span>
          </span>
        ))
      ) : (
        <img
          src={src ?? undefined}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          className={cn(
            "size-full object-cover transition-opacity duration-[var(--duration-fast)]",
            status === "loaded" ? "opacity-100" : "opacity-0",
            className
          )}
          onLoad={(event) => {
            setStatus("loaded")
            onLoad?.(event)
          }}
          onError={(event) => {
            setStatus("error")
            onError?.(event)
          }}
          {...props}
        />
      )}
    </span>
  )
}
