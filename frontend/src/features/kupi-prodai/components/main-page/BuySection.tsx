"use client";
import React, { Suspense } from "react";
import { useProducts } from "@/features/kupi-prodai/api/hooks/useProducts";
import { useSearchLogic } from "@/hooks/use-search-logic";
import { usePreSearchProducts } from "@/features/kupi-prodai/api/hooks/usePreSearchProducts";
import { CombinedSearch } from "@/components/molecules/combined-search";
import { CategorySlider } from "@/components/organisms/category-slider";
import { FilterContainer } from "@/components/organisms/filter-container";
import { ProductLoadingState } from "@/features/kupi-prodai/components/state/product-loading-state";
import { ProductErrorState } from "@/features/kupi-prodai/components/state/product-error-state";
import { ProductEmptyState } from "@/features/kupi-prodai/components/state/product-empy-state";
import { ProductGrid } from "@/features/kupi-prodai/components/common/ProductGrid";
import { useProductForm } from "@/features/kupi-prodai/hooks/useProductForm";
import { Product } from "@/features/kupi-prodai/types";
import { getPlaceholderImage } from "@/utils/image-utils";

export function BuySection() {
  const {
    productItems,
    isLoading,
    isError,
    selectedCategory,
    selectedCondition,
    setSelectedCategory,
    setSelectedCondition,
    setKeyword,
    page,
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
        {isLoading ? (
          <ProductLoadingState />
        ) : isError ? (
          <ProductErrorState error={"Failed to load products."} />
        ) : (productItems?.products.length ?? 0) > 0 ? (
          <ProductGrid
            products={productItems as Types.PaginatedResponse<Product, "products">}
            page={page}
            setPage={setPage}
          />
        ) : (
          <ProductEmptyState />
        )}
      </Suspense>
    </div>
  );
}



