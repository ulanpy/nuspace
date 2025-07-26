import { mockProductData } from "@/data/temporary";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/components/atoms/sonner";
import { useUpdateProduct } from "../api/update-product";
import { ROUTES } from "@/data/routes";

export const useProductForm = (product?: Types.Product) => {
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
    navigate(ROUTES.ADMIN.PRODUCTS.path);
  };

  const handleDelete = () => {
    // In a real app, you would delete the product here
    toast.success("Product deleted successfully");
    navigate(ROUTES.ADMIN.PRODUCTS.path);
  };



  const { mutate: update } = useUpdateProduct({
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries(["products"]);
      navigate(ROUTES.ADMIN.PRODUCTS.path);
    },
  });



  return {
    isUploading,
    isNewProduct,
    product,
    handleInputChange,
    handleSelectChange,
    handleSave,
    handleDelete,
    setProduct,
    update,
  };
};
