import { useListingState } from "@/context/ListingContext";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useMediaEditContext } from "@/context/MediaEditContext";
import { Product } from "@/features/kupi-prodai/types";

export const useEditModal = () => {
  const { setOriginalMedia, setCurrentMediaIndex } = useMediaEditContext();
  const { setMediaFiles: setImageFiles, setPreviewMedia: setPreviewImages } = useMediaUploadContext();

  const { showEditModal, setShowEditModal, setEditingListing, setNewListing } =
    useListingState();

  const handleEditListing = (product: Product) => {
    setEditingListing(product);
    setNewListing({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      condition: product.condition,
      status: product.status || "active",
      user_sub: product.user_sub,
    });
    // Store the initial media state for comparison later
    setPreviewImages(product.media.map((m) => m.url));
    setImageFiles([]);

    // Store the original media for tracking changes
    setOriginalMedia(product.media.map((media) => ({
      id: media.id,
      url: media.url,      
      order: media.media_order.toString(),
    })));
    setCurrentMediaIndex(0);
    setShowEditModal(true);
  };

  const resetEditListing = () => {
    setNewListing({
      name: "",
      description: "",
      price: 0,
      category: "books",
      condition: "new",
      status: "active",
      user_sub: "",
    });
  };

  const closeEditModal = () => {
    resetEditListing();
    setShowEditModal(false);
  };

  return {
    showEditModal,
    closeEditModal,
    setShowEditModal,
    handleEditListing,
    resetEditListing,
  };
};
