import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  kupiProdaiApi,
  NewProductRequest,
} from "@/modules/kupi-prodai/api/kupiProdaiApi";
import { useToast } from "@/hooks/use-toast";
import { useListingState } from "@/context/ListingContext";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useEditModal } from "../../hooks/use-edit-modal";
import { useUser } from "@/hooks/use-user";
import { useMediaUpload } from "@/modules/media/hooks/useMediaUpload";
import { pollForProductImages } from "@/utils/polling";
import { EntityType } from "@/modules/media/types/media-format.enum";



export function useCreateProduct() {
  const { user } = useUser();
  const { toast } = useToast();
  const { setIsUploading } = useMediaUploadContext();
  const { setActiveTab, setUploadProgress } = useListingState();
  const { resetEditListing } = useEditModal();
  const { handleMediaUpload, resetMediaState } = useMediaUpload();

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
      form.get("category"),
    ).toLowerCase() as Types.ProductCategory,
    condition: String(form.get("condition")) as Types.ProductCondition,
    status: "active",
    user_sub: user?.user.sub || "",
  });

  const checkTelegramLinked = (): boolean => {
    const isTelegramLinked = user?.tg_id || false;
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

      await handleMediaUpload({
        entity_type: EntityType.products,
        entityId: newProduct.id,
        mediaFormat: "carousel",
      });
      pollForProductImages(
        newProduct.id,
        queryClient,
        kupiProdaiApi.baseKey,
        kupiProdaiApi.getProduct,
      );

      resetEditListing();
      resetMediaState();

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
