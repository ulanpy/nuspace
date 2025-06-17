// components/molecules/SliderContainer.tsx
import { useRef, useState, ReactNode, useEffect } from "react"; // useEffect қосылды
import { SliderButton } from "@/components/atoms/slider-button";
import { Button } from "../atoms/button";
import { useNavigate } from "react-router-dom";

interface SliderContainerProps {
  title?: string;
  link?: string;
  children: ReactNode; // Кез келген контент
  itemWidth?: number; // Опционалды: Скроллинг үшін элемент енін өзгертуге мүмкіндік
  className?: string; // Стильдеу үшін
}

export function SliderContainer({
  title,
  link,
  children,
  itemWidth = 150, // Әдепкі мәні
  className = "",
}: SliderContainerProps) {
  const navigate = useNavigate();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Тек осы жолды қосыңыз
  useEffect(() => {
    handleScroll();
  }, [children]);

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
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-bold">{title}</h2>
        {link && (
          <Button
            variant="link"
            className="text-xs p-0 h-auto"
            onClick={() => navigate(link)}
          >
            See All
          </Button>
        )}
      </div>
      <div className="relative">
        {canScrollLeft && (
          <SliderButton direction="left" onClick={() => scroll("left")} />
        )}

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto py-1 no-scrollbar"
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
