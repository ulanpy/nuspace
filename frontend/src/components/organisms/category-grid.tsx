import { useRef } from "react";
import { CategoryCard } from "@/components/atoms/category-card";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryGridProps {
  categories: { title: string; icon: JSX.Element; imageUrl?: string }[];
  selectedCategory: string | "";
  setPage?: (page: number) => void;
  setSelectedCategory: (category: string) => void;
  setInputValue?: (value: string) => void;
  setSelectedCondition?: (condition: string) => void;
  onCategorySelect: (title: string) => void;
}

export function CategoryGrid({
  categories,
  selectedCategory,
  onCategorySelect,
}: CategoryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;

    const scrollAmount = 200; // Fixed scroll amount for grid
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Split categories into two rows
  const midIndex = Math.ceil(categories.length / 2);
  const topRowCategories = categories.slice(0, midIndex);
  const bottomRowCategories = categories.slice(midIndex);

  const canScrollLeft = (containerRef.current?.scrollLeft ?? 0) > 0;
  const canScrollRight = containerRef.current
    ? containerRef.current.scrollLeft < 
      containerRef.current.scrollWidth - containerRef.current.clientWidth
    : false;

  return (
    <div className="relative">
      {/* Scroll buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 rounded-full p-1 shadow-md transition-all duration-200"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 rounded-full p-1 shadow-md transition-all duration-200"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Grid Container */}
      <div
        ref={containerRef}
        className="overflow-x-auto no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex flex-col gap-2 sm:gap-3 w-full">
          {/* Top Row */}
          <div className="flex gap-3 sm:gap-4 md:gap-6 justify-start sm:justify-between md:justify-evenly lg:justify-between w-full">
            {topRowCategories.map((cat) => (
              <CategoryCard
                key={`top-${cat.title}`}
                title={cat.title}
                icon={cat.icon}
                imageUrl={cat.imageUrl}
                isSelected={
                  selectedCategory.toLowerCase() === cat.title.toLowerCase()
                }
                onClick={() => onCategorySelect(cat.title)}
              />
            ))}
          </div>
          
          {/* Bottom Row */}
          {bottomRowCategories.length > 0 && (
            <div className="flex gap-3 sm:gap-4 md:gap-6 justify-start sm:justify-between md:justify-evenly lg:justify-between w-full">
              {bottomRowCategories.map((cat) => (
                <CategoryCard
                  key={`bottom-${cat.title}`}
                  title={cat.title}
                  icon={cat.icon}
                  imageUrl={cat.imageUrl}
                  isSelected={
                    selectedCategory.toLowerCase() === cat.title.toLowerCase()
                  }
                  onClick={() => onCategorySelect(cat.title)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}