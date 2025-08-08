import { useNavigate } from "react-router-dom";
import { CategoryGrid } from "./category-grid";

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
  const navigate = useNavigate();

  const handleCategorySelect = (title: string) => {
    setSelectedCategory(title);
    setPage?.(1);
    setInputValue?.("");
    setSelectedCondition?.("All Conditions");

    navigate(`${window.location.pathname}?category=${title.toLowerCase()}`);
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
