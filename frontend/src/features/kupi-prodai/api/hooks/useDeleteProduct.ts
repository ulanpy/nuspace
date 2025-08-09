import { kupiProdaiApi } from "@/features/kupi-prodai/api/kupiProdaiApi";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteProduct() {
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const deleteProductMutation = useMutation({
    mutationFn: kupiProdaiApi.deleteProduct,
    async onSettled() {
      queryClient.invalidateQueries({ queryKey: [kupiProdaiApi.baseKey] });
    },
    async onSuccess(_, deletedId) {
      queryClient.setQueryData(
        kupiProdaiApi.getUserProductsQueryOptions().queryKey,
        (data) =>
          data
            ? {
                ...data,
                products: data.products.filter(
                  (product) => product.id !== deletedId,
                ),
              }
            : undefined,
      );
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    async onError() {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  return {
    handleDelete: deleteProductMutation.mutate,
    getIsPendingDeleteMutation: (id: number) =>
      deleteProductMutation.isPending && deleteProductMutation.variables === id,
  };
}
