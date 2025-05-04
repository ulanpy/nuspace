// organisms/SliderGroup.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListingState } from "@/context/listing-context";
import { SliderButton } from "../atoms/slider-button";
import { CategoriesScrollContainer } from "../molecules/categories-scroll-container";

interface SliderGroupProps {
  categories: { title: string; icon: JSX.Element }[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  setInputValue?: (value: string) => void;
  setSelectedCondition?: (condition: string) => void;
}

export function SliderGroup({
  categories,
  selectedCategory,
  setSelectedCategory,
  setInputValue,
  setSelectedCondition,
}: SliderGroupProps) {
  const navigate = useNavigate();
  const { setCurrentPage } = useListingState();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth - 60;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleCategorySelect = (title: string) => {
    setSelectedCategory(title);
    setCurrentPage(1);
    setInputValue?.("");
    setSelectedCondition?.("All Conditions");

    navigate(`${window.location.pathname}?category=${title.toLowerCase()}`);
  };

  const handleScroll = (canLeft: boolean, canRight: boolean) => {
    setCanScrollLeft(canLeft);
    setCanScrollRight(canRight);
  };

  return (
    <div className="relative">
      <div className="relative">
        {canScrollLeft && (
          <SliderButton direction="left" onClick={() => scroll("left")} />
        )}
        <CategoriesScrollContainer
          ref={containerRef}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          onScroll={handleScroll}
        />
        {canScrollRight && (
          <SliderButton direction="right" onClick={() => scroll("right")} />
        )}
      </div>
    </div>
  );
}