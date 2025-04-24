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

  const createProduct = async (e: React.FormEvent<HTMLFormElement>) => {
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
    const res = await createProductMutation.mutateAsync(
      newProduct
    );
    console.log("res id", res.id);
    return res;
  };

  const uploadImage = async (meta: {
    section: string;
    entityId: number;
    mediaPurpose: string;
    mediaOrder: number;
    mimeType: string;
  }) => {
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
          const { upload_url, filename } = signedUrlsResponse.signed_urls[i];

          const headers: Record<string, string> = {
            "Content-Type": file.type,
            "x-goog-meta-filename": filename, // ✅ decoded
            "x-goog-meta-section": "kp", // ✅ no encodeURIComponent
            "x-goog-meta-entity-id": meta.entityId.toString(),
            "x-goog-meta-media-purpose": meta.mediaPurpose, // ✅ no encodeURIComponent
            "x-goog-meta-media-order": i.toString(),
            "x-goog-meta-mime-type": meta.mimeType, // ✅ must be like "image/jpeg"
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
    const newProduct = await createProduct(e);
    console.log("new", newProduct);
    if (!newProduct) return;
    const meta = {
      section: "kp",
      entityId: newProduct.id,
      mediaPurpose: "banner",
      mediaOrder: 0,
      mimeType: "image/jpeg",
    };
    console.log("3 step:", meta);
    await uploadImage(meta);
    console.log("4 step:");

    resetEditListing();
  };
  return {
    setUploadProgress,
    handleCreate,
  };
}
