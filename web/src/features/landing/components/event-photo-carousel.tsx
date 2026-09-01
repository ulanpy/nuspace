import { useEffect, useRef, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import {
  isCarouselAutoplayEligible,
  wrapCarouselIndex,
} from "@/features/landing/carousel"
import { ResilientImage } from "@/components/resilient-image"
import { cn } from "@/lib/utils"

interface EventPhotoCarouselProps {
  images: readonly string[]
  alt: string
}

function reducedMotionIsPreferred(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  )
}

export function EventPhotoCarousel({ images, alt }: EventPhotoCarouselProps) {
  const [index, setIndex] = useState(0)
  const [isInteracting, setIsInteracting] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    reducedMotionIsPreferred
  )
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => document.visibilityState !== "hidden"
  )
  const carouselRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    mediaQuery.addEventListener("change", updatePreference)
    return () => {
      mediaQuery.removeEventListener("change", updatePreference)
    }
  }, [])

  useEffect(() => {
    const updateVisibility = () => {
      setIsDocumentVisible(document.visibilityState !== "hidden")
    }

    document.addEventListener("visibilitychange", updateVisibility)
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility)
    }
  }, [])

  const canAutoplay = isCarouselAutoplayEligible({
    imageCount: images.length,
    prefersReducedMotion,
    isDocumentVisible,
    isInteracting,
  })

  useEffect(() => {
    if (!canAutoplay) return undefined

    const timer = window.setInterval(() => {
      setIndex((current) => wrapCarouselIndex(current + 1, images.length))
    }, 5000)

    return () => {
      window.clearInterval(timer)
    }
  }, [canAutoplay, images.length])

  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return undefined

    const startInteraction = () => {
      setIsInteracting(true)
    }
    const finishInteraction = () => {
      setIsInteracting(false)
    }
    const finishFocusInteraction = (event: FocusEvent) => {
      const nextTarget = event.relatedTarget
      if (!(nextTarget instanceof Node) || !carousel.contains(nextTarget)) {
        finishInteraction()
      }
    }

    carousel.addEventListener("mouseenter", startInteraction)
    carousel.addEventListener("mouseleave", finishInteraction)
    carousel.addEventListener("focusin", startInteraction)
    carousel.addEventListener("focusout", finishFocusInteraction)
    carousel.addEventListener("touchstart", startInteraction, { passive: true })
    carousel.addEventListener("touchend", finishInteraction, { passive: true })

    return () => {
      carousel.removeEventListener("mouseenter", startInteraction)
      carousel.removeEventListener("mouseleave", finishInteraction)
      carousel.removeEventListener("focusin", startInteraction)
      carousel.removeEventListener("focusout", finishFocusInteraction)
      carousel.removeEventListener("touchstart", startInteraction)
      carousel.removeEventListener("touchend", finishInteraction)
    }
  }, [])

  if (images.length === 0) return null

  const move = (offset: number) => {
    setIndex((current) => wrapCarouselIndex(current + offset, images.length))
  }

  return (
    <section
      ref={carouselRef}
      className="group relative size-full overflow-hidden rounded-xl"
      aria-roledescription="carousel"
      aria-label="Campus event photos"
    >
      <ResilientImage
        key={images[index]}
        src={images[index]}
        alt={`${alt}, photo ${index + 1} of ${images.length}`}
        eager={index === 0}
        containerClassName="absolute inset-0"
      />
      <span
        className="pointer-events-none absolute inset-0 bg-foreground/10"
        aria-hidden
      />

      <button
        type="button"
        onClick={() => {
          move(-1)
        }}
        className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/85 text-foreground shadow-md backdrop-blur-sm transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
        aria-label="Previous event photo"
      >
        <ChevronLeftIcon className="size-5" aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => {
          move(1)
        }}
        className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/85 text-foreground shadow-md backdrop-blur-sm transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
        aria-label="Next event photo"
      >
        <ChevronRightIcon className="size-5" aria-hidden />
      </button>

      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {images.map((image, dotIndex) => (
          <button
            key={image}
            type="button"
            aria-label={`Show event photo ${dotIndex + 1}`}
            aria-current={dotIndex === index ? "true" : undefined}
            onClick={() => {
              setIndex(dotIndex)
            }}
            className={cn(
              "h-2 rounded-full bg-background/80 shadow-sm transition-[width,opacity] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              dotIndex === index ? "w-6 opacity-100" : "w-2 opacity-65"
            )}
          />
        ))}
      </div>
    </section>
  )
}
