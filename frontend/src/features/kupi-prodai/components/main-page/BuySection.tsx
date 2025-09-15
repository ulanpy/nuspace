"use client";
import React, { Suspense } from "react";
import { useProducts } from "@/features/kupi-prodai/api/hooks/useProducts";
import { useSearchLogic } from "@/hooks/use-search-logic";
import { usePreSearchProducts } from "@/features/kupi-prodai/api/hooks/usePreSearchProducts";
import { CombinedSearch } from "@/components/molecules/combined-search";
import { CategorySlider } from "@/components/organisms/category-slider";
import { FilterContainer } from "@/components/organisms/filter-container";
import { ProductLoadingState } from "@/features/kupi-prodai/components/state/product-loading-state";
import { ProductGrid } from "@/features/kupi-prodai/components/common/ProductGrid";
import { useProductForm } from "@/features/kupi-prodai/hooks/useProductForm";

export function BuySection() {
  const {
    selectedCategory,
    selectedCondition,
    setSelectedCategory,
    setSelectedCondition,
    keyword,
    setKeyword,
    setPage,
  } = useProducts();
  
  const {
    categories,
    conditions,
  } = useProductForm();

  const { inputValue, setInputValue, preSearchedItems, handleSearch } =
    useSearchLogic({
      setSelectedCategory,
      baseRoute: "/apps/kupi-prodai",
      searchParam: "text",
      setKeyword,
      setPage,
      usePreSearch: usePreSearchProducts,
    });

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Combined Search and Filter Section */}
      <FilterContainer className="z-[5]">
        <CombinedSearch
          inputValue={inputValue}
          setInputValue={setInputValue}
          preSearchedItems={preSearchedItems}
          handleSearch={handleSearch}
          setKeyword={setKeyword}
          conditions={conditions}
          selectedCondition={selectedCondition}
          setSelectedCondition={setSelectedCondition}
        />
      </FilterContainer>

      {/* Compact Category Grid */}
      <FilterContainer className="pb-2">
        <CategorySlider
          categories={categories.map(cat => ({
            ...cat,
            icon: cat.icon ? React.createElement(cat.icon, { className: "h-5 w-5" }) : React.createElement('div', { className: "h-5 w-5 bg-gray-300 rounded" })
          }))}
          selectedCategory={selectedCategory}
          setPage={setPage}
          setSelectedCategory={setSelectedCategory}
          setInputValue={setInputValue}
          setSelectedCondition={setSelectedCondition}
        />
      </FilterContainer>

      <Suspense fallback={<ProductLoadingState count={8} />}>
        <ProductGrid
          selectedCategory={selectedCategory}
          selectedCondition={selectedCondition}
          keyword={keyword}
        />
      </Suspense>
    </div>
  );
}