import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ResilientImage } from "@/components/shared/media/resilient-image"

export function EventMediaCarousel({
  images,
  alt,
}: {
  images: readonly string[]
  alt: string
}) {
  const [index, setIndex] = useState(0)
  const move = (offset: number) => {
    setIndex((current) => (current + offset + images.length) % images.length)
  }

  return (
    <section
      className="space-y-2"
      aria-roledescription="carousel"
      aria-label="Event posters"
    >
      <div className="group relative aspect-3/4 overflow-hidden rounded-[20px] bg-sidebar ring-1 ring-foreground/10">
        <img
          src={images[index]}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-110 object-cover opacity-75 blur-xl brightness-75 contrast-125 saturate-125"
        />
        <span className="absolute inset-0 bg-background/25" aria-hidden />
        <ResilientImage
          src={images[index]}
          alt={`${alt}, poster ${index + 1} of ${images.length}`}
          eager={index === 0}
          className="object-contain"
          containerClassName="absolute inset-0 bg-transparent"
        />
        {images.length > 1 && (
          <>
            <span
              className="absolute top-3 right-3 rounded-full bg-background/85 px-2 py-1 text-sm font-medium shadow-sm backdrop-blur-sm"
              aria-label={`Poster ${index + 1} of ${images.length}`}
            >
              {index + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => move(-1)}
              className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/85 shadow-md backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Previous poster"
            >
              <ChevronLeftIcon className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/85 shadow-md backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Next poster"
            >
              <ChevronRightIcon className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, thumbnailIndex) => (
            <button
              key={image}
              type="button"
              aria-label={`Show poster ${thumbnailIndex + 1}`}
              aria-current={thumbnailIndex === index ? "true" : undefined}
              onClick={() => setIndex(thumbnailIndex)}
              className={cn(
                "h-20 w-14 shrink-0 overflow-hidden rounded-md ring-2 ring-transparent",
                thumbnailIndex === index && "ring-primary"
              )}
            >
              <img src={image} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
