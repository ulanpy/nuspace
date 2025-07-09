import { Button } from "@/components/atoms/button";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/molecules/form/product-form";
import { useProductForm } from "@/modules/kupi-prodai/hooks/use-product-form";
import { useNavigate, useParams } from "react-router-dom";

// Mock product data (would be fetched from API in a real application)

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    handleDelete,
    product,
    isNewProduct,
    handleSave,
    handleInputChange,
    handleSelectChange,
    isUploading,
    handleImageUpload,
    setMainImage,
    removeImage,
  } = useProductForm();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/admin/products")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isNewProduct ? "Add New Product" : `Edit Product: ${product.name}`}
          </h1>
          {!isNewProduct && (
            <p className="text-gray-500 text-sm">
              Product ID: {id} • Created: 15 Jun 2023
            </p>
          )}
        </div>
      </div>

      <ProductForm
        product={product}
        handleInputChange={handleInputChange}
        handleDelete={handleDelete}
        handleSave={handleSave}
        handleSelectChange={handleSelectChange}
        isNewProduct={isNewProduct}
        setMainImage={setMainImage}
        isUploading={isUploading}
        removeImage={removeImage}
        simulateImageUpload={handleImageUpload}
      />
    </div>
  );
};

export default ProductDetailPage;
