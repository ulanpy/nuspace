import { useListingState } from "@/context/listing-context";
import { useImageContext } from "@/context/image-context";
import { useMediaContext } from "@/context/media-context";

export const useEditModal = () => {
  const { setOriginalMedia, setCurrentMediaIndex } = useMediaContext();
  const { setImageFiles, setPreviewImages } = useImageContext();

  const { showEditModal, setShowEditModal, setEditingListing, setNewListing } =
    useListingState();

  const handleEditListing = (product: Types.Product) => {
    setEditingListing(product);
    setNewListing({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      condition: product.condition,
      status: product.status || "active",
    });
    // Store the initial media state for comparison later
    setPreviewImages(product.media.map((m) => m.url));
    setImageFiles([]);

    // Store the original media for tracking changes
    setOriginalMedia(product.media);
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
