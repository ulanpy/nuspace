import { kupiProdaiApi, NewProductRequest } from "@/api/kupi-prodai-api";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useListingState } from "@/context/listing-context";
import { useImageContext } from "@/context/image-context";
import { useEditModal } from "../form/use-edit-modal";

export function useCreateProduct() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { imageFiles, setIsUploading, setImageFiles } = useImageContext();
  const { setActiveTab, setUploadProgress } = useListingState();
  const { resetEditListing } = useEditModal();

  const queryClient = useQueryClient();

  const createProductMutation = useMutation({
    mutationFn: kupiProdaiApi.createProduct,
    onSettled() {
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: [kupiProdaiApi.baseKey],
        });
      }, 2000);
    },
    onSuccess() {
      setTimeout(() => {
        toast({
          title: "Success",
          description: "Product created successfully",
        });
        setActiveTab("my-listings");
      }, 2000);
    },
    onError() {
      toast({
        title: "Error",
        description: "Failed to create product or upload images",
        variant: "destructive",
      });
    },
  });

  const createProduct = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const newProduct: NewProductRequest = {
      name: String(formData.get("name")),
      description: String(formData.get("description")),
      price: Number(formData.get("price")),
      category: String(formData.get("category")).toLowerCase() as Types.ProductCategory,
      condition: String(formData.get("condition")) as Types.ProductCondition,
      status: "active",
    };
    const isTelegramLinked = user?.tg_linked || false;
    if (!isTelegramLinked) {
      toast({
        title: "Telegram Required",
        description:
          "You need to link your Telegram account before selling items.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    createProductMutation.mutate(
      newProduct
    );
    return newProduct;
  };

  const uploadImage = async () => {
    try {
      setUploadProgress(30);
      if (imageFiles.length > 0) {
        // Get signed URLs for image uploads
        const signedUrlsResponse = await kupiProdaiApi.getSignedUrls(
          imageFiles.length
        );
        setUploadProgress(50);

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const { upload_url } = signedUrlsResponse.signed_urls[i];

          // Optional: Set custom metadata headers
          const headers = {
            'Content-Type': file.type,
            'x-goog-meta-filename': file.name,
            // Add other custom metadata headers as needed
          };

          await fetch(upload_url, {
            method: "PUT",
            headers: headers,
            body: file,
          });
        }
        setUploadProgress(90);
      }

      // Step 3: Refresh user products to show the updated product with images
      setUploadProgress(100);
      setImageFiles([]);
    } catch (err) {
      console.error("Failed to create product or upload images:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createProduct(e);

    await uploadImage();

    resetEditListing();
  };
  return {
    setUploadProgress,
    handleCreate,
  };
}
