import { Button } from "@/components/atoms/button";
import { UseMutateFunction } from "@tanstack/react-query";
interface ProductCardActionsProps {
  product: Types.Product;
  onEdit: (product: Types.Product) => void;
  onDelete: UseMutateFunction<string, Error, number, unknown>;
  onToggleProductStatus: (id: number, currentStatus: Types.Status) => void;
  getIsPendingDeleteMutation: (id: number) => boolean;
  getIsPendingToggleMutation: (id: number) => boolean;
}
export function ProductCardActions({
  product,
  onEdit,
  onDelete,
  onToggleProductStatus,
  getIsPendingDeleteMutation,
  getIsPendingToggleMutation,
}: ProductCardActionsProps) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(product);
        }}
      >
        Edit
      </Button>
      <Button
        disabled={getIsPendingDeleteMutation(product.id)}
        variant="destructive"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(product.id);
        }}
      >
        Delete
      </Button>
      <Button
        disabled={getIsPendingToggleMutation(product.id)}
        variant="secondary"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onToggleProductStatus(product.id, product.status);
        }}
      >
        Mark as Sold
      </Button>
    </>
  );
}
