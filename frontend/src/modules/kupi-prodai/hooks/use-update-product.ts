import { kupiProdaiApi } from "@/api/kupi-prodai-api";
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
        category: newListing.category as Types.ProductCategory,
        condition: newListing.condition as Types.ProductCondition,
        status: newListing.status as Types.Status,
      });

      setUploadProgress(30);

      // Step 2: Delete images that were removed
      if (mediaToDelete.length > 0) {
        const deletePromises = mediaToDelete.map((mediaId) => {
          return fetch(
            `http://localhost/api/bucket/delete?media_id=${mediaId}`,
            {
              method: "DELETE",
              credentials: "include",
            }
          );
        });

        await Promise.all(deletePromises);
        setUploadProgress(50);
      }

      // Step 3: Upload new images if there are any
      if (imageFiles.length > 0) {
        // Get signed URLs for image uploads
        const signedUrlsResponse = await kupiProdaiApi.getSignedUrls(
          imageFiles.length
        );
        console.log("signedUrlsResponse", signedUrlsResponse);
        setUploadProgress(60);

        // Upload each image
        const uploadPromises = imageFiles.map((file, index) => {
          const signedUrl = signedUrlsResponse.signed_urls[index];
          return kupiProdaiApi.uploadImage(
            file,
            signedUrl.filename,
            editingListing.id,
            // Use the next available order number
            originalMedia.length + index + 1
          );
        });
        console.log("uploadPromises", uploadPromises);
        await Promise.all(uploadPromises);
        setUploadProgress(80);
      }
      setUploadProgress(100);

      // Reset form and close modal
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
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return { handleUpdateListing };
};
