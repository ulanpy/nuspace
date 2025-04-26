"use client"

import { useRef, useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Categories {
  title: string
  icon: JSX.Element
}

export function SliderGroup({categories, selectedCategory, setSelectedCategory}: {categories: Categories[], selectedCategory: string, setSelectedCategory: (category: string) => void}) {
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
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 p-2 rounded-full text-white"
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
            className={"flex flex-col items-center justify-center flex-shrink-0 w-[clamp(130px,25vw,150px)] py-6 bg-slate-800  hover:bg-slate-900 hover:scale-105 rounded-2xl text-sm cursor-pointer transition duration-300 ease-in-out text-slate-400 " + (selectedCategory === cat.title ? "bg-slate-900 scale-105 text-slate-200" : "")}
          >
            <div className="text-2xl mb-1">{cat.icon}</div>
            <div className="text-base font-bold tracking-wide">{cat.title}</div>
          </div>
          ))}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 p-2 rounded-full text-white"
          >
            <ChevronRight />
          </button>
        )}
      </div>
    </div>
  )
}

