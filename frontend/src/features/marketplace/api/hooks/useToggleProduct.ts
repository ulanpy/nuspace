import { marketplaceApi } from "@/features/marketplace/api/marketplaceApi";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Status, Product } from "@/features/marketplace/types";

export const useToggleProduct = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleProductMutation = useMutation({
    mutationFn: marketplaceApi.updateProduct,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [marketplaceApi.baseKey] });

      const previousTodos = queryClient.getQueryData(
        marketplaceApi.getUserProductsQueryOptions().queryKey,
      );

      return { previousTodos };
    },
    async onSuccess(_, variables) {
      const { status, product_id } = variables;
      if (status) {
        queryClient.setQueryData(
          marketplaceApi.getUserProductsQueryOptions().queryKey,
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
        // Optimistically update any Buy section infinite lists in cache
        const infiniteQueries = queryClient.getQueriesData<any>({
          predicate: (q) => Array.isArray(q.queryKey)
            && q.queryKey.includes("infinite")
            && q.queryKey.includes(marketplaceApi.baseKey),
        });
        infiniteQueries.forEach(([key, data]) => {
          if (!data || !Array.isArray(data.pages)) return;
          const newPages = data.pages.map((page: any) => {
            // Common shapes: { products: [...] } or raw array
            if (Array.isArray(page)) {
              return status === "inactive"
                ? page.filter((p: Product) => p.id !== product_id)
                : page;
            }
            if (Array.isArray(page?.products)) {
              return {
                ...page,
                products: status === "inactive"
                  ? page.products.filter((p: Product) => p.id !== product_id)
                  : page.products,
              };
            }
            return page;
          });
          // Only set if changed
          if (newPages !== data.pages) {
            queryClient.setQueryData(key, { ...data, pages: newPages });
          }
        });
        // Update individual product cache (product detail page)
        queryClient.setQueryData(["product", String(product_id)], (old: any) =>
          old ? { ...old, status } : old,
        );
        // Revalidate all product lists (buy section) lazily
        queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey)
            && q.queryKey.includes("infinite")
            && q.queryKey.includes(marketplaceApi.baseKey),
        });
        // Revalidate the individual product as well to fetch fresh data
        queryClient.invalidateQueries({ queryKey: ["product", String(product_id)] });
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
          marketplaceApi.getUserProductsQueryOptions().queryKey,
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
