import { CategoryCard } from "@/components/atoms/category-card";

import type { JSX } from "react";

interface CategoryGridProps {
  categories: { title: string; icon?: JSX.Element }[];
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
  return (
    <div className="w-full">
      {/* True Grid Layout */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 sm:gap-2 place-items-center">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.title}
            title={cat.title}
            icon={cat.icon}
            isSelected={
              selectedCategory.toLowerCase() === cat.title.toLowerCase()
            }
            onClick={() => onCategorySelect(cat.title)}
          />
        ))}
      </div>
    </div>
  );
}