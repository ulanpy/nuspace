import {
  kupiProdaiApi,
  SignedUrlRequest,
} from "@/modules/kupi-prodai/api/kupi-prodai-api";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useListingState } from "@/context/listing-context";
import { useImageContext } from "@/context/image-context";
import { useMediaContext } from "@/context/media-context";

export const useUpdateProduct = () => {
  const { toast } = useToast();
  const { imageFiles, setImageFiles, setPreviewImages, setIsUploading } =
    useImageContext();
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

  const queryClient = useQueryClient();

  const updateProductMutation = useMutation({
    mutationFn: kupiProdaiApi.updateProduct,

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [kupiProdaiApi.baseKey] });

      const previousTodos = queryClient.getQueryData(
        kupiProdaiApi.getUserProductsQueryOptions().queryKey
      );

      return { previousTodos };
    },
    onError: (_, __, context) => {
      if (context) {
        queryClient.setQueryData(
          kupiProdaiApi.getUserProductsQueryOptions().queryKey,
          context.previousTodos
        );
      }
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
    async onSuccess() {
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onSettled: () =>
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [kupiProdaiApi.baseKey] });
      }, 1500),
  });

  const calculateMediaOrder = () => {
    const remainingMedia = originalMedia.filter(
      (media) => !mediaToDelete.includes(media.id)
    );

    // Safely convert all orders to numbers
    const validOrders = remainingMedia
      .map((media) => Number(media.order))
      .filter((order) => !isNaN(order));

    return validOrders.length > 0 ? Math.max(...validOrders) + 1 : 0;
  };

  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Step 1: Update the product details
      updateProductMutation.mutateAsync({
        product_id: editingListing.id,
        name: newListing.name,
        description: newListing.description,
        price: newListing.price,
        category: newListing.category.toLowerCase() as Types.ProductCategory,
        condition: newListing.condition as Types.ProductCondition,
        status: newListing.status as Types.Status,
      });

      setUploadProgress(30);

      // Step 2: Delete images that were removed
      if (mediaToDelete.length > 0) {
        const deletePromises = mediaToDelete.map((mediaId) => {
          return fetch(`/api/bucket/delete?media_id=${mediaId}`, {
            method: "DELETE",
            credentials: "include",
          });
        });

        await Promise.all(deletePromises);
        setUploadProgress(50);
      }

      // Step 3: Upload new images if there are any
      if (imageFiles.length > 0) {
        const startOrder = calculateMediaOrder();
        const requests: SignedUrlRequest[] = imageFiles.map((file, index) => ({
          section: "kp",
          entity_id: Number(editingListing.id), // Ensure this is a number
          media_purpose: "banner",
          media_order: startOrder + index, // This should already be a number
          mime_type: file.type,
          content_type: file.type,
        }));

        // Get signed URLs
        const signedUrls = await kupiProdaiApi.getSignedUrls(requests);
        setUploadProgress(60);

        // Upload images using signed URLs
        await Promise.all(
          imageFiles.map((file: File, i: number) => {
            const { upload_url, ...meta } = signedUrls[i];
            return fetch(upload_url, {
              method: "PUT",
              headers: {
                "Content-Type": file.type,
                "x-goog-meta-filename": meta.filename,
                "x-goog-meta-section": meta.section,
                "x-goog-meta-entity-id": meta.entity_id.toString(),
                "x-goog-meta-media-purpose": meta.media_purpose,
                "x-goog-meta-media-order": meta.media_order.toString(),
                "x-goog-meta-mime-type": meta.mime_type,
              },
              body: file,
            });
          })
        );
        setUploadProgress(80);
      }

      // Final cleanup
      setUploadProgress(100);
      setEditingListing(null);
      setNewListing({
        name: "",
        description: "",
        price: 0,
        category: "books",
        condition: "new",
        status: "active",
      });
      setPreviewImages([]);
      setImageFiles([]);
      setOriginalMedia([]);
      setMediaToDelete([]);
      setReorderedMedia([]);
      setShowEditModal(false);
    } catch (err) {
      console.error("Failed to update product:", err);
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

  return { handleUpdateListing };
};
