"use client";

import type React from "react";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ShoppingBag,
  Heart,
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ImageIcon,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Progress } from "../../components/ui/progress";
import { Skeleton } from "../../components/ui/skeleton";
import { useProducts } from "@/modules/kupi-prodai/hooks/use-products";
import { useUserProducts } from "@/modules/kupi-prodai/hooks/use-user-products";
import { useCreateProduct } from "@/modules/kupi-prodai/hooks/use-create-product";
import { useDeleteProduct } from "@/modules/kupi-prodai/hooks/use-delete-product";
import { useUpdateProduct } from "@/modules/kupi-prodai/hooks/use-update-product";
import { useEditModal } from "@/modules/kupi-prodai/form/use-edit-modal";
import { useToggleProduct } from "@/modules/kupi-prodai/hooks/use-toggle-product";
import { useListingState } from "@/context/listing-context";
import { useImageContext } from "@/context/image-context";
import { useMediaContext } from "@/context/media-context";
import { useSearchProduct } from "@/modules/kupi-prodai/hooks/use-search-product";

// Define categories and conditions
const categories = [
  "All Categories",
  "books",
  "electronics",
  "clothing",
  "furniture",
  "appliances",
  "sports",
  "stationery",
  "art_supplies",
  "beauty",
  "services",
  "food",
  "tickets",
  "transport",
  "others",
];

const displayCategories = [
  "All Categories",
  "Books",
  "Electronics",
  "Clothing",
  "Furniture",
  "Appliances",
  "Sports",
  "Stationery",
  "Art Supplies",
  "Beauty",
  "Services",
  "Food",
  "Tickets",
  "Transport",
  "Others",
];

const conditions = ["All Conditions", "new", "like_new", "used"];
const displayConditions = ["All Conditions", "New", "Like New", "Used"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function KupiProdaiPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();
  const { toast } = useToast();
  const [likedProducts, setLikedProducts] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [error] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isTelegramLinked = user?.tg_linked || false;

  // Pagination state
  const [totalPages] = useState(1);

  // Products state [CRUD Hooks]
  const {
    productItems,
    isLoading,
    selectedCategory,
    selectedCondition,
    setSelectedCategory,
    setSelectedCondition,
  } = useProducts();
  const { myProducts } = useUserProducts();
  const { handleCreate } = useCreateProduct();
  const {
    isUploading,
    imageFiles,
    previewImages,
    setPreviewImages,
    setImageFiles,
  } = useImageContext();
  const { getIsPendingDeleteMutation, handleDelete } = useDeleteProduct();
  const { handleUpdateListing } = useUpdateProduct();
  const { handleToggleProductStatus, getIsPendingToggleMutation } =
    useToggleProduct();

  const { searchedProducts } = useSearchProduct();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Edit listing state [Form Hooks]
  const { handleEditListing, closeEditModal } = useEditModal();
  const {
    originalMedia,
    mediaToDelete,
    currentMediaIndex,
    reorderedMedia,
    setCurrentMediaIndex,
    setMediaToDelete,
    setReorderedMedia,
  } = useMediaContext();
  const {
    uploadProgress,
    searchQuery,
    newListing,
    showEditModal,
    currentPage,
    activeTab,
    setActiveTab,
    setCurrentPage,
    setNewListing,
    setSearchQuery,
  } = useListingState();
  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  // Process files for upload
  const processFiles = (files: File[]) => {
    const newPreviewImages = [...previewImages];
    const newImageFiles = [...imageFiles];

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviewImages.push(reader.result as string);
          newImageFiles.push(file);
          setPreviewImages([...newPreviewImages]);
          setImageFiles([...newImageFiles]);
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Only image files are allowed",
          variant: "destructive",
        });
      }
    });
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeImage = (index: number) => {
    const newPreviewImages = [...previewImages];
    const newImageFiles = [...imageFiles];
    newPreviewImages.splice(index, 1);
    newImageFiles.splice(index, 1);
    setPreviewImages(newPreviewImages);
    setImageFiles(newImageFiles);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "price") {
      // Handle price input specially to avoid leading zeros and negative values
      const numValue =
        value === "" ? 0 : Math.max(0, Number.parseInt(value, 10));
      setNewListing((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setNewListing((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePriceInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Clear the input when it's focused and the value is 0
    if (e.target.value === "0") {
      e.target.value = "";
    }
  };

  const handlePriceInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If the input is empty when blurred, set it back to 0
    if (e.target.value === "") {
      setNewListing((prev) => ({ ...prev, price: 0 }));
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewListing((prev) => ({ ...prev, [name]: value }));
  };

  // Add this function to handle image deletion in the edit modal
  const handleDeleteImage = (mediaId: number) => {
    // Add the media ID to the list of media to delete
    setMediaToDelete([...mediaToDelete, mediaId]);

    // Remove the image from the preview images
    const mediaIndex = originalMedia.findIndex((m) => m.id === mediaId);
    if (mediaIndex !== -1) {
      const newPreviewImages = [...previewImages];
      newPreviewImages.splice(mediaIndex, 1);
      setPreviewImages(newPreviewImages);

      // Update reordered media
      const newReorderedMedia =
        reorderedMedia.length > 0
          ? reorderedMedia.filter((m) => m.id !== mediaId)
          : originalMedia.filter((m) => m.id !== mediaId);
      setReorderedMedia(newReorderedMedia);

      // Adjust current index if needed
      if (
        currentMediaIndex >= newPreviewImages.length &&
        newPreviewImages.length > 0
      ) {
        setCurrentMediaIndex(newPreviewImages.length - 1);
      }
    }
  };

  // Add these functions to handle image reordering
  const moveImageUp = (index: number) => {
    if (index <= 0) return;

    // Initialize reorderedMedia if it's empty
    const mediaToReorder =
      reorderedMedia.length > 0
        ? [...reorderedMedia]
        : [...originalMedia.filter((m) => !mediaToDelete.includes(m.id))];

    // Swap the images
    const temp = mediaToReorder[index];
    mediaToReorder[index] = mediaToReorder[index - 1];
    mediaToReorder[index - 1] = temp;

    // Update the preview images to match
    const newPreviewImages = mediaToReorder.map((m) => m.url);

    setReorderedMedia(mediaToReorder);
    setPreviewImages(newPreviewImages);
    setCurrentMediaIndex(index - 1);
  };

  const moveImageDown = (index: number) => {
    // Initialize reorderedMedia if it's empty
    const mediaToReorder =
      reorderedMedia.length > 0
        ? [...reorderedMedia]
        : [...originalMedia.filter((m) => !mediaToDelete.includes(m.id))];

    if (index >= mediaToReorder.length - 1) return;

    // Swap the images
    const temp = mediaToReorder[index];
    mediaToReorder[index] = mediaToReorder[index + 1];
    mediaToReorder[index + 1] = temp;

    // Update the preview images to match
    const newPreviewImages = mediaToReorder.map((m) => m.url);

    setReorderedMedia(mediaToReorder);
    setPreviewImages(newPreviewImages);
    setCurrentMediaIndex(index + 1);
  };

  // Update the handleUpdateListingListing function to handle media changes

  // Delete product

  // Mark product as sold/active

  const toggleLike = (id: number) => {
    if (likedProducts.includes(id)) {
      setLikedProducts(likedProducts.filter((productId) => productId !== id));
    } else {
      setLikedProducts([...likedProducts, id]);
    }
  };

  const getConditionDisplay = (condition: string) => {
    switch (condition) {
      case "new":
        return "New";
      case "like_new":
        return "Like New";
      case "used":
        return "Used";
      default:
        return condition;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "new":
        return "bg-green-500";
      case "like_new":
        return "bg-blue-500";
      case "used":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCategoryDisplay = (category: string) => {
    return (
      category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
    );
  };

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Active and inactive listings
  const activeListings = myProducts?.filter((p) => p.status === "active");
  const inactiveListings = myProducts?.filter((p) => p.status === "inactive");
  const soldListings = myProducts?.filter((p) => p.status === "inactive");

  // Product skeleton for loading state
  const ProductSkeleton = () => (
    <Card className="overflow-hidden h-full">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Add this function to renew a sold product

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Kupi&Prodai</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Buy and sell items within the university community
        </p>
      </div>

      <Tabs
        defaultValue="buy"
        className="w-full"
        onValueChange={(value) => setActiveTab(value as Types.ActiveTab)}
        value={activeTab}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="buy">Buy</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
        </TabsList>

        {/* BUY SECTION */}
        <TabsContent
          value="buy"
          className="space-y-3 sm:space-y-4 pt-3 sm:pt-4"
        >
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-9 text-sm"
                value={searchQuery.trim()}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex gap-2 sm:size-default"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>

          {/* Simple Filter UI */}
          {showFilters && (
            <div className="p-4 border rounded-md bg-background space-y-3">
              <div className="space-y-1">
                <label htmlFor="category" className="block text-sm font-medium">
                  Category
                </label>
                <select
                  id="category"
                  className="w-full p-2 border rounded-md bg-background text-foreground"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((category, index) => (
                    <option key={category} value={category}>
                      {displayCategories[index]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="condition"
                  className="block text-sm font-medium"
                >
                  Condition
                </label>
                <select
                  id="condition"
                  className="w-full p-2 border rounded-md bg-background text-foreground"
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                >
                  {conditions.map((condition, index) => (
                    <option key={condition} value={condition}>
                      {displayConditions[index]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("All Categories");
                    setSelectedCondition("All Conditions");
                  }}
                >
                  Reset
                </Button>
                <Button size="sm" onClick={() => setShowFilters(false)}>
                  Apply
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                // onClick={fetchProducts}
              >
                Try Again
              </Button>
            </div>
          ) : (productItems?.products?.length ?? 0) > 0 ? (
            <>
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {productItems?.products.map((product) => (
                  <motion.div key={product.id} variants={itemVariants}>
                    <Card
                      className="overflow-hidden h-full cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() =>
                        navigate(`/apps/kupi-prodai/product/${product.id}`)
                      }
                    >
                      <div className="aspect-square relative">
                        <img
                          src={
                            product.media[0]?.url ||
                            "https://placehold.co/200x200?text=No+Image"
                          }
                          alt={product.name}
                          className="object-cover w-full h-full"
                        />
                        <Badge
                          className={`absolute top-2 right-2 ${getConditionColor(
                            product.condition
                          )} text-white text-xs`}
                        >
                          {getConditionDisplay(product.condition)}
                        </Badge>
                      </div>
                      <CardContent className="p-2 sm:p-3">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h3 className="font-medium text-xs sm:text-sm line-clamp-1">
                              {product.name}
                            </h3>
                            <p className="text-sm sm:text-base font-bold">
                              {product.price} ₸
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground mb-1">
                          <div className="flex items-center">
                            <span>
                              {product.category &&
                                getCategoryDisplay(product.category)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex gap-1 text-muted-foreground hover:text-primary"
                          >
                            <Heart className="h-4 w-4" />
                            <span>Like</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex gap-1 text-muted-foreground hover:text-primary"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>Message</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => paginate(currentPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <span className="mx-2 text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => paginate(currentPage + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p>No products found.</p>
            </div>
          )}
        </TabsContent>

        {/* SELL SECTION */}
        <TabsContent value="sell" className="space-y-4 pt-4">
          {!isAuthenticated ? (
            <Alert variant="destructive">
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                You must be logged in to create a listing.
                <Button variant="link" onClick={() => login()}>
                  Login
                </Button>
              </AlertDescription>
            </Alert>
          ) : !isTelegramLinked ? (
            <Alert
            variant="warning"
            className="bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900"
          >
            <AlertTitle className="flex items-center gap-2">
              Telegram Required
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p>You need to link your Telegram account before selling items.</p>
            </AlertDescription>
          </Alert>
          )

          : (
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium">
                  Name
                </label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={newListing.name}
                  onChange={handleInputChange}
                  required
                  className="bg-background text-foreground"
                  placeholder="What are you selling?"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={newListing.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-2 border rounded-md bg-background text-foreground"
                  placeholder="Describe your item..."
                />
              </div>

              {/* Price, Category, and Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="price" className="block text-sm font-medium">
                    Price (₸)
                  </label>
                  <Input
                    type="number"
                    id="price"
                    name="price"
                    value={newListing.price === 0 ? "" : newListing.price}
                    onChange={handleInputChange}
                    onFocus={handlePriceInputFocus}
                    onBlur={handlePriceInputBlur}
                    min="0"
                    step="1"
                    required
                    className="bg-background text-foreground"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium"
                  >
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={newListing.category}
                    onChange={handleSelectChange}
                    className="w-full p-2 border rounded-md bg-background text-foreground"
                    required
                  >
                    {categories.slice(1).map((category, index) => (
                      <option key={category} value={category}>
                        {displayCategories[index + 1]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="condition"
                    className="block text-sm font-medium"
                  >
                    Condition
                  </label>
                  <select
                    id="condition"
                    name="condition"
                    value={newListing.condition}
                    onChange={handleSelectChange}
                    className="w-full p-2 border rounded-md bg-background text-foreground"
                    required
                  >
                    {conditions.slice(1).map((condition, index) => (
                      <option key={condition} value={condition}>
                        {displayConditions[index + 1]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image Upload with Drag and Drop */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Images</label>
                <div
                  ref={dropZoneRef}
                  className={`border-2 ${
                    isDragging ? "border-primary" : "border-dashed"
                  } rounded-md p-6 transition-colors duration-200 ease-in-out`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-1">
                      Upload a file or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      PNG, JPG, GIF up to 10MB
                    </p>
                    <input
                      type="file"
                      name="images"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                    />
                    <Button type="button" variant="outline" size="sm">
                      Upload a file
                    </Button>
                  </div>
                </div>

                {/* Image Preview */}
                {previewImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                    {previewImages.map((src, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-md overflow-hidden"
                      >
                        <img
                          src={src || "/placeholder.svg"}
                          alt={`Preview ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(index);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isUploading || !isTelegramLinked}
                className="w-full"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="animate-spin h-4 w-4" />
                    <span>Uploading... {uploadProgress}%</span>
                  </div>
                ) : (
                  "Create Listing"
                )}
              </Button>

              {isUploading && (
                <Progress value={uploadProgress} className="mt-2" />
              )}
            </form>
          )}
        </TabsContent>

        {/* MY LISTINGS SECTION */}
        <TabsContent value="my-listings" className="space-y-4 pt-4">
          {!isAuthenticated ? (
            <Alert variant="destructive">
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                You must be logged in to view your listings.
                <Button variant="link" onClick={() => login()}>
                  Login
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Active Listings */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Active Listings</h2>
                {(activeListings?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeListings?.map((product) => (
                      <Card
                        key={product.id}
                        className="overflow-hidden"
                        onClick={() => navigate(`/apps/kupi-prodai/product/${product.id}`)}
                      >
                        <div className="aspect-square relative">
                          <img
                            src={
                              product.media[0]?.url ||
                              "https://placehold.co/200x200?text=No+Image"
                            }
                            alt={product.name}
                            className="object-cover w-full h-full"
                          />
                          <Badge
                            className={`absolute top-2 right-2 ${getConditionColor(
                              product.condition
                            )} text-white text-xs`}
                          >
                            {getConditionDisplay(product.condition)}
                          </Badge>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                          <p className="text-sm font-bold">{product.price} ₸</p>
                          <div className="flex justify-between mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditListing(product);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              disabled={getIsPendingDeleteMutation(product.id)}
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(product.id);
                              }}
                            >
                              Delete
                            </Button>
                            <Button
                              disabled={getIsPendingToggleMutation(product.id)}
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleProductStatus(product.id, product.status);
                              }}
                            >
                              Mark as Sold
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                    ))}
                  </div>
                ) : (
                  <p>No active listings found.</p>
                )}
              </div>

              {/* Inactive Listings */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Inactive Listings</h2>
                {(inactiveListings?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inactiveListings?.map((product) => (
                      <Card key={product.id} className="overflow-hidden">
                        <div className="aspect-square relative">
                          <img
                            src={
                              product.media[0]?.url ||
                              "https://placehold.co/200x200?text=No+Image"
                            }
                            alt={product.name}
                            className="object-cover w-full h-full"
                          />
                          <Badge
                            className={`absolute top-2 right-2 ${getConditionColor(
                              product.condition
                            )} text-white text-xs`}
                          >
                            {getConditionDisplay(product.condition)}
                          </Badge>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-sm font-bold">{product.price} ₸</p>
                          <div className="flex justify-between mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditListing(product)}
                            >
                              Edit
                            </Button>
                            <Button
                              disabled={getIsPendingDeleteMutation(product.id)}
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                            >
                              Delete
                            </Button>
                            <Button
                              disabled={getIsPendingToggleMutation(product.id)}
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                handleToggleProductStatus(
                                  product.id,
                                  product.status
                                )
                              }
                            >
                              Mark as Active
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p>No inactive listings found.</p>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Update the sold items section */}
        <TabsContent value="sold" className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (soldListings?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {soldListings?.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden h-full cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() =>
                    navigate(`/apps/kupi-prodai/product/${product.id}`)
                  }
                >
                  <div className="aspect-square relative">
                    <img
                      src={
                        product.media[0]?.url ||
                        "https://placehold.co/200x200?text=No+Image"
                      }
                      alt={product.name}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <Badge className="bg-green-500 text-white text-sm px-3 py-1">
                        SOLD
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-1 sm:mb-2">
                      <div>
                        <h3 className="font-medium text-sm sm:text-base">
                          {product.name}
                        </h3>
                        <p className="text-base sm:text-lg font-bold">
                          {product.price} ₸
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryDisplay(product.category)}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-3">
                      <p className="line-clamp-2">{product.description}</p>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleToggleProductStatus(product.id, "active");
                        }}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        Renew Listing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No sold items</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Items you've sold will appear here.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Replace the Edit Listing Modal with this enhanced version */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-6 text-center">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div
              className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-background rounded-lg shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-headline"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold" id="modal-headline">
                  Edit Listing
                </h2>
                <Button variant="ghost" size="sm" onClick={closeEditModal}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <form onSubmit={handleUpdateListing} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left column: Product details */}
                  <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                      <label
                        htmlFor="edit-name"
                        className="block text-sm font-medium"
                      >
                        Name
                      </label>
                      <Input
                        type="text"
                        id="edit-name"
                        name="name"
                        value={newListing.name}
                        onChange={handleInputChange}
                        required
                        className="bg-background text-foreground"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <label
                        htmlFor="edit-description"
                        className="block text-sm font-medium"
                      >
                        Description
                      </label>
                      <textarea
                        id="edit-description"
                        name="description"
                        value={newListing.description}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full p-2 border rounded-md bg-background text-foreground"
                      />
                    </div>

                    {/* Price, Category, and Condition */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="edit-price"
                          className="block text-sm font-medium"
                        >
                          Price (₸)
                        </label>
                        <Input
                          type="number"
                          id="edit-price"
                          name="price"
                          value={newListing.price === 0 ? "" : newListing.price}
                          onChange={handleInputChange}
                          onFocus={handlePriceInputFocus}
                          onBlur={handlePriceInputBlur}
                          min="0"
                          step="1"
                          required
                          className="bg-background text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="edit-category"
                          className="block text-sm font-medium"
                        >
                          Category
                        </label>
                        <select
                          id="edit-category"
                          name="category"
                          value={newListing.category}
                          onChange={handleSelectChange}
                          className="w-full p-2 border rounded-md bg-background text-foreground"
                        >
                          {categories.slice(1).map((category, index) => (
                            <option key={category} value={category}>
                              {displayCategories[index + 1]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="edit-condition"
                          className="block text-sm font-medium"
                        >
                          Condition
                        </label>
                        <select
                          id="edit-condition"
                          name="condition"
                          value={newListing.condition}
                          onChange={handleSelectChange}
                          className="w-full p-2 border rounded-md bg-background text-foreground"
                        >
                          {conditions.slice(1).map((condition, index) => (
                            <option key={condition} value={condition}>
                              {displayConditions[index + 1]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Right column: Image carousel and controls */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        Images
                      </label>

                      {/* Image carousel */}
                      <div className="relative aspect-square rounded-md overflow-hidden border border-border">
                        {previewImages.length > 0 ? (
                          <>
                            <img
                              src={
                                previewImages[currentMediaIndex] ||
                                "/placeholder.svg"
                              }
                              alt={`Product image ${currentMediaIndex + 1}`}
                              className="object-contain w-full h-full"
                            />

                            {/* Image navigation */}
                            {previewImages.length > 1 && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setCurrentMediaIndex((prev) =>
                                      prev === 0
                                        ? previewImages.length - 1
                                        : prev - 1
                                    );
                                  }}
                                  type="button"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setCurrentMediaIndex((prev) =>
                                      prev === previewImages.length - 1
                                        ? 0
                                        : prev + 1
                                    );
                                  }}
                                  type="button"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>

                                {/* Image indicators */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                  {previewImages.map((_, index) => (
                                    <Button
                                      key={index}
                                      type="button"
                                      className={`w-2 h-2 rounded-full ${
                                        index === currentMediaIndex
                                          ? "bg-primary"
                                          : "bg-background/80"
                                      }`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setCurrentMediaIndex(index);
                                      }}
                                    />
                                  ))}
                                </div>
                              </>
                            )}

                            {/* Image actions */}
                            <div className="absolute top-2 right-2 flex gap-1">
                              {/* Always show delete button */}
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-background/80"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const mediaToRemove = originalMedia.find(
                                    (m) =>
                                      m.url === previewImages[currentMediaIndex]
                                  );
                                  if (mediaToRemove) {
                                    handleDeleteImage(mediaToRemove.id);
                                  } else {
                                    // This is a newly added image
                                    const newImageFiles = [...imageFiles];
                                    const newPreviewImages = [...previewImages];
                                    newImageFiles.splice(
                                      currentMediaIndex - originalMedia.length,
                                      1
                                    );
                                    newPreviewImages.splice(
                                      currentMediaIndex,
                                      1
                                    );
                                    setImageFiles(newImageFiles);
                                    setPreviewImages(newPreviewImages);
                                    if (
                                      currentMediaIndex >=
                                        newPreviewImages.length &&
                                      newPreviewImages.length > 0
                                    ) {
                                      setCurrentMediaIndex(
                                        newPreviewImages.length - 1
                                      );
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>

                              {/* Reordering buttons */}
                              {previewImages.length > 1 && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-background/80"
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveImageUp(currentMediaIndex);
                                    }}
                                    disabled={currentMediaIndex === 0}
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-background/80"
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveImageDown(currentMediaIndex);
                                    }}
                                    disabled={
                                      currentMediaIndex ===
                                      previewImages.length - 1
                                    }
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <ImageIcon className="h-12 w-12 mb-2" />
                            <p>No images</p>
                            <p className="text-xs mt-2">
                              Upload images to showcase your product
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Image thumbnails */}
                      {previewImages.length > 0 && (
                        <div className="flex overflow-x-auto gap-2 py-2">
                          {previewImages.map((src, index) => (
                            <button
                              key={index}
                              type="button"
                              className={`relative w-16 h-16 rounded-md overflow-hidden border-2 ${
                                index === currentMediaIndex
                                  ? "border-primary"
                                  : "border-transparent"
                              }`}
                              onClick={() => setCurrentMediaIndex(index)}
                            >
                              <img
                                src={src || "/placeholder.svg"}
                                alt={`Thumbnail ${index + 1}`}
                                className="object-cover w-full h-full"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Add new images */}
                      <div
                        ref={dropZoneRef}
                        className={`border-2 ${
                          isDragging ? "border-primary" : "border-dashed"
                        } rounded-md p-4 transition-colors duration-200 ease-in-out`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center justify-center text-center">
                          <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm font-medium mb-1">
                            Add more images
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Click or drag and drop
                          </p>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeEditModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUploading}
                    className="min-w-[120px]"
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>{uploadProgress}%</span>
                      </div>
                    ) : (
                      "Update Listing"
                    )}
                  </Button>
                </div>

                {isUploading && (
                  <Progress value={uploadProgress} className="mt-2" />
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
