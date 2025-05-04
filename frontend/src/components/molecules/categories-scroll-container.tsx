// molecules/CategoriesScrollContainer.tsx
import { useRef, useEffect } from "react";
import { CategoryCard } from "../atoms/category-card";


interface CategoriesScrollContainerProps {
  categories: { title: string; icon: JSX.Element }[];
  selectedCategory: string;
  onCategorySelect: (title: string) => void;
  onScroll?: (canScrollLeft: boolean, canScrollRight: boolean) => void;
}

export const CategoriesScrollContainer = ({
  categories,
  selectedCategory,
  onCategorySelect,
  onScroll
}: CategoriesScrollContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el || !onScroll) return;

    const canScrollLeft = el.scrollLeft > 0;
    const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;

    onScroll(canScrollLeft, canScrollRight);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => checkScroll();
    el.addEventListener("scroll", handleScroll);

    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-auto space-x-4 no-scrollbar py-2"
    >
      {categories.map((cat) => (
        <CategoryCard
          key={cat.title}
          title={cat.title}
          icon={cat.icon}
          isSelected={selectedCategory.toLowerCase() === cat.title.toLowerCase()}
          onClick={() => onCategorySelect(cat.title)}
        />
      ))}
    </div>
  );
};