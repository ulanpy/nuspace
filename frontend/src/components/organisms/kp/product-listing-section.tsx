import { ProductCardActions } from "@/components/molecules/actions/product-card-actions";
import { ProductCard } from "@/components/molecules/cards/product-card";
import { UseMutateFunction } from "@tanstack/react-query";

interface ProductListingSectionProps {
  title: string;
  products: Types.Product[];
  emptyMessage: string;
  onProductClick: (productId: number) => void;
  onEditListing: (product: Types.Product) => void;
  onDeleteListing: UseMutateFunction<string, Error, number, unknown>;
  onToggleListingStatus: (id: number, currentStatus: Types.Status) => void;
  getIsPendingDeleteMutation: (id: number) => boolean;
  getIsPendingToggleMutation: (id: number) => boolean;
}

export function ProductListingSection({
  title,
  products,
  emptyMessage,
  onProductClick,
  onEditListing,
  onDeleteListing,
  onToggleListingStatus,
  getIsPendingDeleteMutation,
  getIsPendingToggleMutation,
}: ProductListingSectionProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {(products?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products?.map((product) => (
            <ProductCard
              product={product}
              onClick={() => onProductClick(product.id)}
              key={product.id}
            >
              <ProductCardActions
                product={product}
                onEdit={onEditListing}
                onDelete={onDeleteListing}
                onToggleProductStatus={onToggleListingStatus}
                getIsPendingDeleteMutation={getIsPendingDeleteMutation}
                getIsPendingToggleMutation={getIsPendingToggleMutation}
              />
            </ProductCard>
          ))}
        </div>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </div>
  );
}
