"use client";;
import { useRouter } from "next/navigation";
import { CategoryGrid } from "./category-grid";

import type { JSX } from "react";

interface CategorySliderProps {
  categories: { title: string; icon?: JSX.Element}[];
  selectedCategory: string | "";
  setPage?: (page: number) => void;
  setSelectedCategory: (category: string) => void;
  setInputValue?: (value: string) => void;
  setSelectedCondition?: (condition: string) => void;
}

export function CategorySlider({
  categories,
  selectedCategory,
  setPage,
  setSelectedCategory,
  setInputValue,
  setSelectedCondition,
}: CategorySliderProps) {
  const router = useRouter();

  const handleCategorySelect = (title: string) => {
    setSelectedCategory(title);
    setPage?.(1);
    setInputValue?.("");
    setSelectedCondition?.("All Conditions");

    router.push(`${window.location.pathname}?category=${title.toLowerCase()}`);
  };

  return (
    <>
      {categories?.length > 0 && (
        <CategoryGrid
          categories={categories}
          selectedCategory={selectedCategory}
          setPage={setPage}
          setSelectedCategory={setSelectedCategory}
          setInputValue={setInputValue}
          setSelectedCondition={setSelectedCondition}
          onCategorySelect={handleCategorySelect}
        />
      )}
    </>
  );
}
