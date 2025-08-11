import { kupiProdaiApi } from "@/features/kupi-prodai/api/kupiProdaiApi";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Status } from "@/features/kupi-prodai/types";

export const useToggleProduct = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleProductMutation = useMutation({
    mutationFn: kupiProdaiApi.updateProduct,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [kupiProdaiApi.baseKey] });

      const previousTodos = queryClient.getQueryData(
        kupiProdaiApi.getUserProductsQueryOptions().queryKey,
      );

      return { previousTodos };
    },
    async onSuccess(_, variables) {
      const { status, product_id } = variables;
      if (status) {
        queryClient.setQueryData(
          kupiProdaiApi.getUserProductsQueryOptions().queryKey,
          (old) =>
            old
              ? {
                  ...old,
                  products: old.products.map((product) =>
                    product.id === product_id
                      ? { ...product, status }
                      : product,
                  ),
                }
              : old,
        );
        queryClient.invalidateQueries({
          queryKey: [kupiProdaiApi.baseKey, "list"],
        });
      }
      toast({
        title: "Success",
        description:
          status === "active"
            ? "Product marked as active"
            : "Product marked as inactive",
      });
    },
    async onError(_, __, context) {
      if (context) {
        queryClient.setQueryData(
          kupiProdaiApi.getUserProductsQueryOptions().queryKey,
          context.previousTodos,
        );
      }
      toast({
        title: "Error",
        description: "Failed to update product status",
        variant: "destructive",
      });
    },
  });

  const handleToggleProductStatus = (
    id: number,
    currentStatus: Status,
  ) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    toggleProductMutation.mutate({
      product_id: id,
      status: newStatus,
    });
  };

  return {
    handleToggleProductStatus,
    getIsPendingToggleMutation: (id: number) =>
      toggleProductMutation.isPending &&
      toggleProductMutation.variables.product_id === id,
  };
};
