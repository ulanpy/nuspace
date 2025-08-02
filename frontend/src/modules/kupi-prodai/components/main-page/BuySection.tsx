"use client";
import { Suspense } from "react";
import { useProducts } from "@/modules/kupi-prodai/api/hooks/useProducts";
import { useSearchLogic } from "@/hooks/use-search-logic";
import { SearchInput } from "@/components/molecules/search-input";
import { ConditionGroup } from "@/components/molecules/condition-group";
import { CategorySlider } from "@/components/organisms/category-slider";
import { ProductLoadingState } from "@/modules/kupi-prodai/components/state/product-loading-state";
import { ProductErrorState } from "@/modules/kupi-prodai/components/state/product-error-state";
import { ProductEmptyState } from "@/modules/kupi-prodai/components/state/product-empy-state";
import { ProductGrid } from "@/modules/kupi-prodai/components/common/ProductGrid";
import { useProductForm } from "@/modules/kupi-prodai/hooks/useProductForm";


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
    <div className="space-y-3 sm:space-y-4 flex flex-col gap-3">
      {/* Categories section - separate row */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <SearchInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            preSearchedProducts={preSearchedProducts}
            handleSearch={handleSearch}
            setKeyword={setKeyword}
            setSelectedCondition={setSelectedCondition}
          />
        </div>

        <ConditionGroup
          conditions={conditions}
          selectedCondition={selectedCondition}
          setSelectedCondition={setSelectedCondition}
        />
        <CategorySlider
          categories={categories}
          selectedCategory={selectedCategory}
          setPage={setPage}
          setSelectedCategory={setSelectedCategory}
          setInputValue={setInputValue}
          setSelectedCondition={setSelectedCondition}
        />
      </div>

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



