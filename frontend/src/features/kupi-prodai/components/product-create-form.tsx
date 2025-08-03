import { useListingState } from "@/context/ListingContext";
import { useMediaUpload } from "@/features/media/hooks/useMediaUpload";
import { useMediaSelection } from "@/features/media/hooks/useMediaSelection";
import { useProductForm } from "@/features/kupi-prodai/hooks/useProductForm";
import { UnifiedProductForm, ProductFormData } from "./forms/UnifiedProductForm";


interface ProductCreateFormProps {
  uploadProgress: number;
  handleCreate: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const ProductCreateForm = ({
  uploadProgress,
  handleCreate,
}: ProductCreateFormProps) => {
  const { isUploading } = useMediaUpload();
  const {
    previewMedia,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removeNewMedia,
  } = useMediaSelection();
  const {
    categories,
    conditions,
    handlePriceInputBlur,
    handlePriceInputFocus,
  } = useProductForm();
  const { newListing } = useListingState();

  const handleFormSubmit = (_data: ProductFormData, e: React.FormEvent) => {
    // Pass through the form event to maintain compatibility
    handleCreate(e as React.FormEvent<HTMLFormElement>);
  };

  return (
    <UnifiedProductForm
      mode="create"
      initialData={newListing}
      onSubmit={handleFormSubmit}
      categories={categories}
      conditions={conditions}
      isSubmitting={isUploading}
      uploadProgress={uploadProgress}
      previewMedia={previewMedia}
      isDragging={isDragging}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onFileSelect={handleFileSelect}
      onRemoveNewMedia={removeNewMedia}
      onPriceFocus={handlePriceInputFocus}
      onPriceBlur={handlePriceInputBlur}
      showLoadingSkeleton={true}
      loadingDuration={1500}
    />
  );
};
