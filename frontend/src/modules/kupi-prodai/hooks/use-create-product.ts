import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  kupiProdaiApi,
  NewProductRequest,
} from "@/modules/kupi-prodai/api/kupi-prodai-api";
import { useToast } from "@/hooks/use-toast";
import { useListingState } from "@/context/listing-context";
import { useImageContext } from "@/context/image-context";
import { useEditModal } from "../form/use-edit-modal";
import { useUser } from "@/hooks/use-user";
import { useProductImages } from "./use-product-images";
import { pollForProductImages } from "@/utils/polling";

export function useCreateProduct() {
  const { user } = useUser();
  const { toast } = useToast();
  const { setIsUploading } = useImageContext();
  const { setActiveTab, setUploadProgress } = useListingState();
  const { resetEditListing } = useEditModal();
  const { handleImageUpload, resetImageState } = useProductImages();

  const queryClient = useQueryClient();

  const createProductMutation = useMutation({
    mutationFn: kupiProdaiApi.createProduct,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      setActiveTab("my-listings");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const extractProductData = (form: FormData): NewProductRequest => ({
    name: String(form.get("name")),
    description: String(form.get("description")),
    price: Number(form.get("price")),
    category: String(
      form.get("category")
    ).toLowerCase() as Types.ProductCategory,
    condition: String(form.get("condition")) as Types.ProductCondition,
    status: "active",
  });

  const checkTelegramLinked = (): boolean => {
    const isTelegramLinked = user?.tg_linked || false;
    if (!isTelegramLinked) {
      toast({
        title: "Telegram Required",
        description:
          "You need to link your Telegram account before selling items.",
        variant: "destructive",
      });
    }
    return isTelegramLinked;
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!checkTelegramLinked()) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);

      const formData = new FormData(e.currentTarget);
      const productData = extractProductData(formData);

      const newProduct = await createProductMutation.mutateAsync(productData);

      await handleImageUpload({
        entity_type: "products",
        entityId: newProduct.id,
        mediaFormat: "carousel",
      });
      pollForProductImages(
        newProduct.id,
        queryClient,
        kupiProdaiApi.baseKey,
        kupiProdaiApi.getProduct
      );

      resetEditListing();
      resetImageState();

      return newProduct;
    } catch (error) {
      console.error("Product creation failed:", error);
      toast({
        title: "Error",
        description: "Failed to create product or upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    handleCreate,
    isCreating: createProductMutation.isPending,
  };
}
