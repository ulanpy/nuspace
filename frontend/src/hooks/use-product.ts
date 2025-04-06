import {
  createProduct,
  getAllProducts,
  removeProduct,
  updateProduct,
} from "@/api/kupi-prodai-api";
import { useState } from "react";

export function useProducts() {
  const [newListing, setNewListing] = useState({
    title: "",
    price: "",
    category: "",
    condition: "",
    location: "",
    description: "",
    telegramUsername: "",
  });
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const onGetMyProducts = async (): Promise<Types.Product[] | null> => {
    try {
      const products: Types.Product[] = await getAllProducts();
      const myProducts = products.filter((product) => product.isOwner === true);
      return myProducts;
    } catch (err) {
      console.log(err);
      return null;
    }
  };

  const onGetAllProducts = async (): Promise<Types.Product[] | []> => {
    try {
      setLoading(true);
      const products: Types.Product[] = await getAllProducts();
      return products;
    } catch (err) {
      console.log(err);
      return [];
    }
  };

  const onCreateProduct = async (): Promise<Types.Product | null> => {
    if (previewImages.length === 0) {
      alert("Please upload at least one image");
      return null;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const newProduct: Types.Product = {
      id: Date.now(),
      title: newListing.title,
      price: Number(newListing.price),
      category: newListing.category,
      condition: newListing.condition as "New" | "Used" | "Like New",
      images: previewImages.map((url, index) => ({ id: index + 1, url })),
      seller: "You",
      location: newListing.location,
      likes: 0,
      messages: 0,
      description: newListing.description,
      telegramUsername: newListing.telegramUsername,
      datePosted: "Just now",
      isOwner: true,
    };

    try {
      await createProduct(newProduct);
      setNewListing({
        title: "",
        price: "",
        category: "",
        condition: "",
        location: "",
        description: "",
        telegramUsername: "",
      });
      setSuccess(true);
      // Пусть пока стоит. Потом функция не будет ничего возвращать
      return newProduct;
    } catch (err) {
      setError("Ошибка при создании продукта");
      console.error(err);
      // Пусть пока стоит. Потом функция не будет ничего возвращать
      return null;
    } finally {
      setLoading(false);
    }
  };

  const onRemoveProduct = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await removeProduct(id);
    } catch (err) {
      setError("Ошибка при удалении продукта");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const onUpdateProduct = async (
    editingListing: Types.Product | null
  ) => {
    try {
      setLoading(true);
      setError(null);
      if (editingListing) {
        const updatedListing: Types.Product = {
          ...editingListing,
          title: newListing.title,
          price: Number(newListing.price),
          category: newListing.category,
          condition: newListing.condition as "New" | "Used" | "Like New",
          images: previewImages.map((url, index) => ({ id: index + 1, url })),
          location: newListing.location,
          description: newListing.description,
          telegramUsername: newListing.telegramUsername,
        };
        await updateProduct(editingListing.id, updatedListing);
        // Пусть пока стоит. Потом функция не будет ничего возвращать
        return updatedListing;
      }
      // Пусть пока стоит. Потом функция не будет ничего возвращать
      return null;
    } catch (err) {
      setError("Ошибка при обновление продукта");
      console.log(err);
      // Пусть пока стоит. Потом функция не будет ничего возвращать
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newPreviewImages = [...previewImages];

      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviewImages.push(reader.result as string);
          setPreviewImages([...newPreviewImages]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    const newPreviewImages = [...previewImages];
    newPreviewImages.splice(index, 1);
    setPreviewImages(newPreviewImages);
  };
  return {
    newListing,
    previewImages,
    loading,
    error,
    success,
    setNewListing,
    setPreviewImages,
    onGetMyProducts,
    onGetAllProducts,
    onCreateProduct,
    onUpdateProduct,
    onRemoveProduct,
    handleImageUpload,
    removeImage,
  };
}
