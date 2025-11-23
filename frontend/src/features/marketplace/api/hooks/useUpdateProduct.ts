import { useMutation, useQueryClient } from "@tanstack/react-query";
import { marketplaceApi } from "@/features/marketplace/api/marketplaceApi";
import { useToast } from "@/hooks/use-toast";
import { useListingState } from "@/context/ListingContext";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useMediaEditContext } from "@/context/MediaEditContext";
import { useMediaUpload } from "@/features/media/hooks/useMediaUpload";
import { pollForProductImages } from "@/utils/polling";
import { EntityType, MediaFormat } from "@/features/media/types/types";
import { mediaApi } from "@/features/media/api/mediaApi";
import { ProductCategory, ProductCondition, Status } from "@/features/marketplace/types";


export function useUpdateProduct() {
  const { toast } = useToast();
  const { setIsUploading } = useMediaUploadContext();
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
  } = useMediaEditContext();


  const { 
    handleMediaUpload: handleMediaUpload, 
    resetMediaState: resetMediaState 
  } = useMediaUpload();



  const queryClient = useQueryClient();

  const updateProductMutation = useMutation({
    mutationFn: marketplaceApi.updateProduct,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [marketplaceApi.baseKey] });
      const previousTodos = queryClient.getQueryData(
        marketplaceApi.getUserProductsQueryOptions().queryKey,
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
          marketplaceApi.getUserProductsQueryOptions().queryKey,
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
      user_sub: "",
    });
    setOriginalMedia([]);
    setMediaToDelete([]);
    setReorderedMedia([]);
    setShowEditModal(false);
    resetMediaState();
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
        category: newListing.category.toLowerCase() as ProductCategory,
        condition: newListing.condition as ProductCondition,
        status: newListing.status as Status,
      });

      setUploadProgress(30);

      if (mediaToDelete.length > 0) {
        await mediaApi.deleteMedia(mediaToDelete);
        setUploadProgress(50);
      }

      const startOrder = calculateMediaOrder();
      await handleMediaUpload({
        entity_type: EntityType.products,
        entityId: Number(editingListing.id),
        mediaFormat: MediaFormat.carousel,
        startOrder,
      });
      pollForProductImages(
        editingListing.id,
        queryClient,
        marketplaceApi.baseKey,
        marketplaceApi.getProduct,
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
