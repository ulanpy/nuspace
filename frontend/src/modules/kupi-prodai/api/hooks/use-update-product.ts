import { useMutation, useQueryClient } from "@tanstack/react-query";
import { kupiProdaiApi } from "@/modules/kupi-prodai/api/kupi-prodai-api";
import { useToast } from "@/hooks/use-toast";
import { useListingState } from "@/context/listing-context";
import { useImageContext } from "@/context/image-context";
import { useMediaContext } from "@/context/media-context";
import { useProductImages } from "../../hooks/use-product-images";
import { pollForProductImages } from "@/utils/polling";

export function useUpdateProduct() {
  const { toast } = useToast();
  const { setIsUploading } = useImageContext();
  const {
    newListing,
    editingListing,
    setEditingListing,
    setNewListing,
    setUploadProgress,
    setShowEditModal,
  } = useListingState();
  const {
    mediaToDelete,
    originalMedia,
    setMediaToDelete,
    setOriginalMedia,
    setReorderedMedia,
  } = useMediaContext();
  const { handleImageUpload, deleteMedia, resetImageState } =
    useProductImages();

  const queryClient = useQueryClient();

  const updateProductMutation = useMutation({
    mutationFn: kupiProdaiApi.updateProduct,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [kupiProdaiApi.baseKey] });
      const previousTodos = queryClient.getQueryData(
        kupiProdaiApi.getUserProductsQueryOptions().queryKey,
      );
      return { previousTodos };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (_, __, context) => {
      if (context) {
        queryClient.setQueryData(
          kupiProdaiApi.getUserProductsQueryOptions().queryKey,
          context.previousTodos,
        );
      }
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const calculateMediaOrder = () => {
    const remainingMedia = originalMedia.filter(
      (media) => !mediaToDelete.includes(media.id),
    );

    const validOrders = remainingMedia
      .map((media) => Number(media.order))
      .filter((order) => !isNaN(order));

    return validOrders.length > 0 ? Math.max(...validOrders) + 1 : 0;
  };

  const resetState = () => {
    setEditingListing(null);
    setNewListing({
      name: "",
      description: "",
      price: 0,
      category: "books",
      condition: "new",
      status: "active",
    });
    setOriginalMedia([]);
    setMediaToDelete([]);
    setReorderedMedia([]);
    setShowEditModal(false);
    resetImageState();
  };

  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);

      await updateProductMutation.mutateAsync({
        product_id: editingListing.id,
        name: newListing.name,
        description: newListing.description,
        price: newListing.price,
        category: newListing.category.toLowerCase() as Types.ProductCategory,
        condition: newListing.condition as Types.ProductCondition,
        status: newListing.status as Types.Status,
      });

      setUploadProgress(30);

      if (mediaToDelete.length > 0) {
        await deleteMedia(mediaToDelete);
        setUploadProgress(50);
      }

      const startOrder = calculateMediaOrder();
      await handleImageUpload({
        entity_type: "products",
        entityId: Number(editingListing.id),
        mediaFormat: "carousel",
        startOrder,
      });
      pollForProductImages(
        editingListing.id,
        queryClient,
        kupiProdaiApi.baseKey,
        kupiProdaiApi.getProduct,
      );
      resetState();
    } catch (error) {
      console.error("Failed to update product:", error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    handleUpdateListing,
    isUpdating: updateProductMutation.isPending,
  };
}
