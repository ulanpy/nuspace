import { useNavigate } from "react-router-dom";
import { CategoryCard } from "@/components/atoms/category-card";
import { SliderContainer } from "../molecules/slider-container";

interface CategorySliderProps {
  categories: { title: string; icon: JSX.Element }[];
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
    <SliderContainer itemWidth={180}>
      {categories.map((cat) => (
        <CategoryCard
          key={cat.title}
          title={cat.title}
          icon={cat.icon}
          isSelected={
            selectedCategory.toLowerCase() === cat.title.toLowerCase()
          }
          onClick={() => handleCategorySelect(cat.title)}
        />
      ))}
    </SliderContainer>
  );
}
