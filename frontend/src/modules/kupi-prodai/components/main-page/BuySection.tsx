"use client";
import { Suspense } from "react";
import { useProducts } from "@/modules/kupi-prodai/api/hooks/useProducts";
import { useSearchLogic } from "@/hooks/use-search-logic";
import { CombinedSearch } from "@/components/molecules/combined-search";
import { CategorySlider } from "@/components/organisms/category-slider";
import { FilterContainer } from "@/components/organisms/filter-container";
import { ProductLoadingState } from "@/modules/kupi-prodai/components/state/product-loading-state";
import { ProductErrorState } from "@/modules/kupi-prodai/components/state/product-error-state";
import { ProductEmptyState } from "@/modules/kupi-prodai/components/state/product-empy-state";
import { ProductGrid } from "@/modules/kupi-prodai/components/common/ProductGrid";
import { useProductForm } from "@/modules/kupi-prodai/hooks/useProductForm";
import { Product } from "@/modules/kupi-prodai/types";

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

  const { inputValue, setInputValue, preSearchedProducts, handleSearch } =
    useSearchLogic({
      setSelectedCategory,
      baseRoute: "/apps/kupi-prodai",
      searchParam: "text",
      setKeyword,
      setPage,
    });

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Combined Search and Filter Section */}
      <FilterContainer>
        <CombinedSearch
          inputValue={inputValue}
          setInputValue={setInputValue}
          preSearchedProducts={preSearchedProducts}
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
          categories={categories}
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



