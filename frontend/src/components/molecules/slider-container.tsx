// components/molecules/SliderContainer.tsx
import { useRef, useState, ReactNode } from "react";
import { SliderButton } from "@/components/atoms/slider-button";

interface SliderContainerProps {
  children: ReactNode; // Кез келген контент
  itemWidth?: number; // Опционалды: Скроллинг үшін элемент енін өзгертуге мүмкіндік
  className?: string; // Стильдеу үшін
}

export function SliderContainer({
  children,
  itemWidth = 150, // Әдепкі мәні
  className = "",
}: SliderContainerProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;

    // itemWidth параметрі арқылы скроллинг мөлшерін бақылау
    const scrollAmount = Math.max(el.clientWidth - itemWidth, 60);

    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    // Скролл күйін жаңарту
    const canScrollLeft = el.scrollLeft > 0;
    const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 5; // 5px қор

    setCanScrollLeft(canScrollLeft);
    setCanScrollRight(canScrollRight);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {canScrollLeft && (
          <SliderButton direction="left" onClick={() => scroll("left")} />
        )}

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto py-4 no-scrollbar"
        >
          {children}
        </div>

        {canScrollRight && (
          <SliderButton direction="right" onClick={() => scroll("right")} />
        )}
      </div>
    </div>
  );
}