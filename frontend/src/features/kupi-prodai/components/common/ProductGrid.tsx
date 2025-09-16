import { useNavigate } from "react-router-dom";
import { ProductCard } from "@/features/kupi-prodai/components/product-card";
import { ROUTES } from "@/data/routes";
import { Product } from "@/features/kupi-prodai/types";
import { InfiniteList } from "@/components/virtual/InfiniteList";
export function ProductGrid({
  selectedCategory,
  selectedCondition,
  keyword,
}: {
  selectedCategory?: string;
  selectedCondition?: string;
  keyword?: string;
}) {
  const navigate = useNavigate();

  // Render function for product cards
  const renderProductCard = (product: Product) => (
    <ProductCard
      key={product.id}
      product={product}
      onClick={() =>
        navigate(
          ROUTES.APPS.KUPI_PRODAI.PRODUCT.DETAIL_FN(product.id.toString()),
        )
      }
    />
  );

  // Render empty state
  const renderEmpty = () => (
    <div className="text-center py-12">
      <div className="text-lg font-medium mb-2">No products found</div>
      <p className="text-sm text-muted-foreground">
        Try adjusting your search criteria or check back later for new listings.
      </p>
    </div>
  );

  // Render loading state
  const renderLoading = () => (
    <div className="text-center py-8">
      <div className="text-sm text-muted-foreground">Loading products...</div>
    </div>
  );

  // Render load more state
  const renderLoadMore = () => (
    <div className="text-center py-4">
      <div className="text-sm text-muted-foreground">Loading more products...</div>
    </div>
  );

  return (
    <InfiniteList<Product>
        queryKey={[
          "kupi-prodai", 
          "products", 
          selectedCategory || "all", 
          selectedCondition || "all", 
          keyword || ""
        ]}
        apiEndpoint="/products"
        size={12}
        keyword={keyword || ""}
        additionalParams={{
          status: "active",
          category: selectedCategory !== "All" ? selectedCategory?.toLowerCase() : undefined,
          condition: selectedCondition !== "All Conditions" ? selectedCondition?.toLowerCase() : undefined,
        }}
        renderItem={renderProductCard}
        renderEmpty={renderEmpty}
        renderLoading={renderLoading}
        renderLoadMore={renderLoadMore}
        showSearch={false}
        gridLayout={{
          mobile: 2,
          tablet: 3,
          desktop: 4
        }}
        itemCountPlaceholder="Products"
      />
  );
}
