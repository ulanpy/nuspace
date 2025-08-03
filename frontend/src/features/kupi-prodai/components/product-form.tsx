import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";
import { UnifiedProductForm, ProductFormData } from "./forms/UnifiedProductForm";

interface ProductFormProps {
  product: ProductFormData;
  categories: Types.DisplayCategory[];
  conditions: string[];
  handleSave: (data: ProductFormData, e: React.FormEvent) => void;
  setMainImage: (imageId: number) => void;
  removeImage: (imageId: number) => void;
  simulateImageUpload: () => void;
  isUploading: boolean;
  isNewProduct: boolean;
  handleDelete: () => void;
}

export const ProductForm = ({
  product,
  categories,
  conditions,
  handleSave,
  setMainImage,
  removeImage,
  simulateImageUpload,
  isUploading,
  isNewProduct,
  handleDelete,
}: ProductFormProps) => {
  const navigate = useNavigate();

  const handleCancel = () => {
    navigate(ROUTES.ADMIN.PRODUCTS.path);
  };

  return (
    <UnifiedProductForm
      mode={isNewProduct ? "create" : "edit"}
      initialData={product}
      onSubmit={handleSave}
      onCancel={handleCancel}
      onDelete={!isNewProduct ? handleDelete : undefined}
      categories={categories}
      conditions={conditions}
      isSubmitting={isUploading}

      onSetMainImage={setMainImage}
      onRemoveImage={removeImage}
      onUploadNewImage={simulateImageUpload}
      showLoadingSkeleton={false}
      title={isNewProduct ? "Create Product" : "Edit Product"}
    />
  );
};
