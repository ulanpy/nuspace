import { kupiProdaiApi } from "@/api/kupi-prodai-api";
import { useListingState } from "@/context/listing-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useToggleProduct = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useListingState;
  const { currentPage, itemsPerPage } = useListingState();

  const toggleProductMutation = useMutation({
    mutationFn: kupiProdaiApi.updateProduct,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [kupiProdaiApi.baseKey] });

      const previousTodos = queryClient.getQueryData(
        kupiProdaiApi.getUserProductsQueryOptions().queryKey
      );

      return { previousTodos };
    },
    async onSuccess(_, variables) {
      const { status, product_id } = variables;
      if (status) {
        queryClient.setQueryData(
          kupiProdaiApi.getUserProductsQueryOptions().queryKey,
          (old) =>
            old?.map((product) =>
              product.id === product_id ? { ...product, status } : product
            )
        );
        queryClient.setQueryData(
          kupiProdaiApi.getProductsQueryOptions({
            page: currentPage,
            size: itemsPerPage,
          }).queryKey,
          (old) => {
            if (!old) return old;

            if (status === "inactive") {
              return {
                ...old,
                products: old.products.filter(
                  (product) => product.status === "active"
                ),
              };
            }
          }
        );
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
          context.previousTodos
        );
      }
      toast({
        title: "Error",
        description: "Failed to update product status",
        variant: "destructive",
      });
    },
  });

  const handleToggleProductStatus = (id: number, currentStatus: Status) => {
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
