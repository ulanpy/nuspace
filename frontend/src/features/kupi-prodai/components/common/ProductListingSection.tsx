import { ProductCard } from "@/features/kupi-prodai/components/product-card";
import { UseMutateFunction } from "@tanstack/react-query";
import { Status } from "@/features/kupi-prodai/types";
import { Product } from "@/features/kupi-prodai/types";
import React from "react";

interface ProductListingSectionProps {
  products: Product[];
  emptyMessage: React.ReactNode;
  onProductClick: (productId: number) => void;
  onEditListing: (product: Product) => void;
  onDeleteListing: UseMutateFunction<string, Error, number, unknown>;
  onToggleListingStatus: (id: number, currentStatus: Status) => void;
  getIsPendingDeleteMutation: (id: number) => boolean;
  getIsPendingToggleMutation: (id: number) => boolean;
}

export function ProductListingSection({
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
      {(products?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products?.map((product) => (
            <ProductCard
              product={product}
              onClick={() => onProductClick(product.id)}
              key={product.id}
            />
          ))}
        </div>
      ) : (
        <div>{emptyMessage}</div>
      )}
    </div>
  );
}
