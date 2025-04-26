"use client"

import { useRef, useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTheme } from "./theme-provider" // Assuming you're using the same theme provider

interface Categories {
  title: string
  icon: JSX.Element
}

export function SliderGroup({
  categories,
  selectedCategory,
  setSelectedCategory
}: {
  categories: Categories[],
  selectedCategory: string,
  setSelectedCategory: (category: string) => void
}) {
  const { theme } = useTheme()
  const isDarkTheme = theme === "dark"
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => checkScroll()
    el.addEventListener("scroll", handleScroll)

    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const scrollAmount = el.clientWidth - 60
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  return (
    <div className="relative">
      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full ${
              isDarkTheme
                ? "bg-black/50 text-white hover:bg-black/70"
                : "bg-white/70 text-black hover:bg-white/90 shadow-md"
            }`}
          >
            <ChevronLeft />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto space-x-4 no-scrollbar py-2"
        >
          {categories.map((cat) => (
            <div
              key={cat.title}
              onClick={() => setSelectedCategory(cat.title)}
              className={`
                flex flex-col items-center justify-center flex-shrink-0
                w-[clamp(90px,14vw,115px)] py-3
                rounded-xl text-sm cursor-pointer
                border border-border/40
                transition duration-300 ease-in-out mb-2
                ${selectedCategory === cat.title
                  ? isDarkTheme
                    ? "bg-slate-900 text-white scale-105 shadow-lg border-slate-700"
                    : "bg-slate-100 text-slate-900 scale-105 shadow-lg border-slate-200"
                  : isDarkTheme
                    ? "bg-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-300 hover:scale-105"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 hover:scale-105"
                }
              `}
            >
              <div className="text-lg mb-1">
                {cat.icon}
              </div>
              <div className="text-2xs font-bold tracking-wide">{cat.title}</div>
            </div>
          ))}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full ${
              isDarkTheme
                ? "bg-black/50 text-white hover:bg-black/70"
                : "bg-white/70 text-black hover:bg-white/90 shadow-md"
            }`}
          >
            <ChevronRight />
          </button>
        )}
      </div>
    </div>
  )
}