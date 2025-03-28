"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTheme } from "./theme-provider"

interface CarouselProps {
  items: {
    id: string | number
    content: React.ReactNode
    gradient: string
    accentColor: string
  }[]
  autoPlay?: boolean
  interval?: number
  showControls?: boolean
  showIndicators?: boolean
}

// Variants remain the same as in your original component
const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.4 },
      scale: { duration: 0.4 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.4 },
      scale: { duration: 0.4 },
    },
  }),
}

const buttonVariants = {
  initial: { opacity: 0.7, scale: 1 },
  hover: {
    opacity: 1,
    scale: 1.1,
    transition: {
      scale: { type: "spring", stiffness: 400, damping: 17 },
      opacity: { duration: 0.2 },
    },
  },
  tap: { scale: 0.95 },
}

const indicatorVariants = {
  inactive: { scale: 1, opacity: 0.5 },
  active: {
    scale: 1.2,
    opacity: 1,
    transition: {
      scale: { type: "spring", stiffness: 300, damping: 20 },
      opacity: { duration: 0.3 },
    },
  },
}

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1.5,
    transition: {
      opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
      scale: { duration: 0.5, type: "spring", stiffness: 300, damping: 25 },
    },
  },
}

// Example of how to use an image in a carousel item
const carouselItemsWithImage = [
  {
    id: 1,
    content: (
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <motion.h2
          className="text-3xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Welcome to our platform
        </motion.h2>
        <motion.p
          className="text-muted-foreground max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Discover amazing features and services tailored just for you
        </motion.p>
      </div>
    ),
    gradient: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
    accentColor: "rgb(59 130 246)",
  },
  {
    id: 2,
    content: (
      <div className="w-full h-full flex items-center justify-center">
        <img src="/images/carousel-image.jpg" alt="Featured image" className="object-cover w-full h-full rounded-xl" />
      </div>
    ),
    gradient: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.06) 50%, rgba(194,65,12,0) 100%)",
    accentColor: "rgb(249 115 22)",
  },
  // ... other carousel items remain the same
]

export function GlowCarouselWithImage({
  items = carouselItemsWithImage,
  autoPlay = true,
  interval = 5000,
  showControls = true,
  showIndicators = true,
}: CarouselProps) {
  const [[page, direction], setPage] = useState([0, 0])
  const [isPaused, setIsPaused] = useState(false)
  const { theme } = useTheme()
  const isDarkTheme = theme === "dark"

  const itemIndex = Math.abs(page % items.length)
  const currentItem = items[itemIndex]

  const paginate = useCallback((newDirection: number) => {
    setPage(([prevPage]) => [prevPage + newDirection, newDirection])
  }, [])

  const goToSlide = useCallback(
    (index: number) => {
      const newDirection = index > itemIndex ? 1 : -1
      setPage([index, newDirection])
    },
    [itemIndex],
  )

  useEffect(() => {
    if (!autoPlay || isPaused) return

    const interval_id = setInterval(() => {
      paginate(1)
    }, interval)

    return () => clearInterval(interval_id)
  }, [autoPlay, interval, isPaused, paginate])

  return (
    <div
      className="relative w-full max-w-3xl overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <motion.div
        className="relative w-full aspect-[16/9] bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-lg border border-border/40 shadow-lg rounded-2xl overflow-hidden"
        initial="initial"
        animate="animate"
      >
        <motion.div
          className={`absolute -inset-2 bg-gradient-radial from-transparent ${
            isDarkTheme
              ? "via-blue-400/20 via-30% via-purple-400/20 via-60% via-red-400/20 via-90%"
              : "via-blue-400/10 via-30% via-purple-400/10 via-60% via-red-400/10 via-90%"
          } to-transparent rounded-3xl z-0 pointer-events-none`}
          variants={glowVariants}
        />

        <motion.div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: currentItem.gradient,
            opacity: 0.2,
            borderRadius: "16px",
          }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 0.5 }}
        />

        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 flex items-center justify-center p-6"
          >
            {currentItem.content}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {showControls && (
        <>
          <motion.button
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 flex items-center justify-center text-foreground shadow-lg"
            onClick={() => paginate(-1)}
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>

          <motion.button
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 flex items-center justify-center text-foreground shadow-lg"
            onClick={() => paginate(1)}
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
        </>
      )}

      {showIndicators && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {items.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2.5 h-2.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm ${
                index === itemIndex ? `shadow-[0_0_10px_1px_${currentItem.accentColor}]` : ""
              }`}
              variants={indicatorVariants}
              animate={index === itemIndex ? "active" : "inactive"}
              style={{
                backgroundColor: index === itemIndex ? currentItem.accentColor : undefined,
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

