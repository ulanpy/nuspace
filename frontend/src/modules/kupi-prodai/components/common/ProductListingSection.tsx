import { ProductCardActions } from "@/modules/kupi-prodai/components/product-card-actions";
import { ProductCard } from "@/modules/kupi-prodai/components/product-card";
import { UseMutateFunction } from "@tanstack/react-query";
import { Status } from "@/modules/kupi-prodai/types";
import { Product } from "@/modules/kupi-prodai/types";

interface ProductListingSectionProps {
  title: string;
  products: Product[];
  emptyMessage: string;
  onProductClick: (productId: number) => void;
  onEditListing: (product: Product) => void;
  onDeleteListing: UseMutateFunction<string, Error, number, unknown>;
  onToggleListingStatus: (id: number, currentStatus: Status) => void;
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
              actions={
                <ProductCardActions
                  product={product}
                  onEdit={onEditListing}
                  onDelete={onDeleteListing}
                  onToggleProductStatus={onToggleListingStatus}
                  getIsPendingDeleteMutation={getIsPendingDeleteMutation}
                  getIsPendingToggleMutation={getIsPendingToggleMutation}
                />
              }
            />
          ))}
        </div>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </div>
  );
}
