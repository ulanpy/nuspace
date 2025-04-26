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
    entity_id: number;
    media_purpose: string;
    mediaOrder: number;
    mime_type: string;
  }) => {
    try {
      setUploadProgress(30);
      if (imageFiles.length > 0) {
        const signedUrlsResponse = await kupiProdaiApi.getSignedUrls(
          meta
        );
        setUploadProgress(50);

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const { upload_url, filename } = signedUrlsResponse.signed_urls[i];

          const headers: Record<string, string> = {
            "Content-Type": file.type,
            "x-goog-meta-filename": filename,
            "x-goog-meta-section": "kp",
            "x-goog-meta-entity-id": meta.entity_id.toString(),
            "x-goog-meta-media-purpose": meta.media_purpose,
            "x-goog-meta-media-order": i.toString(),
            "x-goog-meta-mime-type": meta.mime_type,
          };

          await fetch(upload_url, {
            method: "PUT",
            headers: headers,
            body: signedUrlsResponse,
          });
        }
        setUploadProgress(90);
      }

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
      entity_id: newProduct.id,
      media_purpose: "banner",
      media_order: 0,
      mime_type: "image/jpeg",
    };
    console.log("3 step:", meta);
    await uploadImage(meta);


    resetEditListing();
  };
  return {
    setUploadProgress,
    handleCreate,
  };
}
