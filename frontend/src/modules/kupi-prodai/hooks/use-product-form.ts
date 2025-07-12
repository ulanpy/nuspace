import { mockProductData } from "@/data/temporary";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/components/atoms/sonner";
export const useProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNewProduct = id === "new";
  const [product, setProduct] = useState(
    isNewProduct
      ? {
          name: "",
          description: "",
          price: 0,
          category: "",
          seller: "",
          status: "Active",
          quantity: 0,
          images: [],
        }
      : mockProductData,
  );

  const [isUploading, setIsUploading] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setProduct({
      ...product,
      [name]: value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setProduct({
      ...product,
      [name]: value,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would save the product here
    toast.success(
      isNewProduct
        ? "Product created successfully"
        : "Product updated successfully",
    );
    navigate("/admin/products");
  };

  const handleDelete = () => {
    // In a real app, you would delete the product here
    toast.success("Product deleted successfully");
    navigate("/admin/products");
  };

  const handleImageUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      const newImage = {
        id: Math.random(),
        url: "https://via.placeholder.com/300",
        main: product.images.length === 0,
      };
      setProduct({
        ...product,
        images: [...product.images, newImage],
      });
      toast.success("Image uploaded successfully");
    }, 1500);
  };

  const setMainImage = (imageId: number) => {
    setProduct({
      ...product,
      images: product.images.map((img) => ({
        ...img,
        main: img.id === imageId,
      })),
    });
  };

  const removeImage = (imageId: number) => {
    setProduct({
      ...product,
      images: product.images.filter((img) => img.id !== imageId),
    });
  };

  return {
    isUploading,
    isNewProduct,
    product,
    handleInputChange,
    handleSelectChange,
    handleSave,
    handleDelete,
    handleImageUpload,
    setMainImage,
    removeImage,
    setProduct,
  };
};
