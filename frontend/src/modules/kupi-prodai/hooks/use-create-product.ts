import imageCompression from "browser-image-compression";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  kupiProdaiApi,
  NewProductRequest,
  SignedUrlRequest,
} from "@/modules/kupi-prodai/api/kupi-prodai-api";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
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
      category: String(
        formData.get("category")
      ).toLowerCase() as Types.ProductCategory,
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
    const res = await createProductMutation.mutateAsync(newProduct);
    console.log("res id", res.id);
    return res;
  };

  const uploadImage = async (meta: {
    section: string;
    entityId: number;
    mediaPurpose: string;
  }) => {
    if (!imageFiles.length) return;

    // 1) prepare one SignedUrlRequest per file
    const requests: SignedUrlRequest[] = imageFiles.map(
      (file: File, idx: number) => ({
        section: meta.section,
        entity_id: meta.entityId,
        media_purpose: meta.mediaPurpose,
        media_order: idx,
        mime_type: file.type,
        content_type: file.type,
      })
    );

    setIsUploading(true);
    setUploadProgress(30);

    // 2) POST to get the signed URLs
    const signedUrls = await kupiProdaiApi.getSignedUrls(requests);
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    const compressedImages = await Promise.all(
      imageFiles.map(async (imageFile) => {
        console.log('originalFile instanceof Blob', imageFile instanceof Blob); // true
        console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);
        return await imageCompression(imageFile, options);
      })
    );
    setUploadProgress(50);

    await Promise.all(
      compressedImages.map((file: File, i: number) => {
        const {
          upload_url,
          filename,
          content_type,
          section,
          entity_id,
          media_purpose,
          media_order,
          mime_type,
        } = signedUrls[i];

        const headers: Record<string, string> = {
          "Content-Type": content_type,
          "x-goog-meta-filename": filename,
          "x-goog-meta-section": section,
          "x-goog-meta-entity-id": entity_id.toString(),
          "x-goog-meta-media-purpose": media_purpose,
          "x-goog-meta-media-order": media_order.toString(),
          "x-goog-meta-mime-type": mime_type,
        };

        return fetch(upload_url, {
          method: "PUT",
          headers,
          body: file,
        });
      })
    );

    setUploadProgress(90);

    // 4) Done
    setUploadProgress(100);
    setImageFiles([]);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newProduct = await createProduct(e);
    if (!newProduct) return;

    await uploadImage({
      section: "kp",
      entityId: newProduct.id,
      mediaPurpose: "banner",
    });

    resetEditListing();
  };

  return {
    setUploadProgress,
    handleCreate,
  };
}
