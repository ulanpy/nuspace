"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import {
  ShoppingBag,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ImageIcon,
  Trash2,
  Plus,
} from "lucide-react";
import { Input } from "../../components/atoms/input";
import { Button } from "../../components/atoms/button";
import { Card, CardContent } from "../../components/atoms/card";
import { Badge } from "../../components/atoms/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/atoms/tabs";
import { ConditionGroup } from "@/components/molecules/condition-group";
import { useNavigate } from "react-router-dom";
import { Progress } from "../../components/atoms/progress";
import { useProducts } from "@/modules/kupi-prodai/api/hooks/use-products";
import { useUserProducts } from "@/modules/kupi-prodai/api/hooks/use-user-products";
import { useCreateProduct } from "@/modules/kupi-prodai/api/hooks/use-create-product";
import { useDeleteProduct } from "@/modules/kupi-prodai/api/hooks/use-delete-product";
import { useUpdateProduct } from "@/modules/kupi-prodai/api/hooks/use-update-product";
import { useEditModal } from "@/modules/kupi-prodai/form/use-edit-modal";
import { useToggleProduct } from "@/modules/kupi-prodai/api/hooks/use-toggle-product";
import { useListingState } from "@/context/listing-context";
import { useImageContext } from "@/context/image-context";
import { useMediaContext } from "@/context/media-context";
import { SearchInput } from "@/components/molecules/search-input";
import { useSearchLogic } from "@/hooks/use-search-logic";
import { CategorySlider } from "@/components/organisms/category-slider";
import {
  AuthRequiredAlert,
  TelegramRequiredAlert,
} from "@/components/molecules/auth-required-alert";
import { ProductLoadingState } from "@/components/molecules/state/product-loading-state";
import { ProductErrorState } from "@/components/molecules/state/product-error-state";
import { ProductEmptyState } from "@/components/molecules/state/product-empy-state";
import { ProductGrid } from "@/components/organisms/kp/product-grid";
import { useUser } from "@/hooks/use-user";
import { ProductListingSection } from "@/components/organisms/kp/product-listing-section";
import { ProductCreateForm } from "@/components/molecules/form/product-create-form";
import { useImage } from "@/modules/kupi-prodai/form/use-image";
import { useProduct } from "@/components/molecules/form/use-product";
import { getCategoryDisplay } from "@/utils/products-utils";

const displayConditions = ["All Conditions", "New", "Used"];

export default function KupiProdaiPage() {
  const navigate = useNavigate();
  // useUser
  const { user, login } = useUser();
  const [error] = useState<string | null>(null);
  const [isDragging] = useState(false);
  const isTelegramLinked = user?.tg_linked || false;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  // Edit listing state [Form Hooks]
  const { handleEditListing, closeEditModal } = useEditModal();
  const { originalMedia, currentMediaIndex, setCurrentMediaIndex } =
    useMediaContext();
  const { uploadProgress, newListing, showEditModal, activeTab, setActiveTab } =
    useListingState();
  // Handle image upload
  const {
    handleImageUpload,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleDeleteImage,
  } = useImage();
  const {
    conditions,
    categories,
    handleInputChange,
    handlePriceInputBlur,
    handlePriceInputFocus,
    handleSelectChange,
  } = useProduct();

  // Active and inactive listings
  const activeListings = myProducts?.filter((p) => p.status === "active");
  const inactiveListings = myProducts?.filter((p) => p.status === "inactive");
  const soldListings = myProducts?.filter((p) => p.status === "inactive");

  // Product skeleton for loading state

  // search section
  const {
    inputValue,
    setInputValue,
    preSearchedProducts,
    handleSearch,
    searchedProducts,
  } = useSearchLogic({
    setSelectedCategory,
    baseRoute: "/apps/kupi-prodai",
    searchParam: "text",
  });
  const [products, setProducts] =
    useState<Types.PaginatedResponse<Types.Product> | null>(null);

  useEffect(() => {
    if (searchedProducts) {
      setProducts(searchedProducts);
    }
  }, [searchedProducts]);

  useEffect(() => {
    setProducts(productItems);
  }, [productItems]);

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
        className="w-full flex flex-col gap-4"
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
          className="space-y-3 sm:space-y-4 flex flex-col gap-3"
        >
          {/* Categories section - separate row */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="relative flex-1">
                <SearchInput
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  preSearchedProducts={preSearchedProducts}
                  handleSearch={handleSearch}
                  setSelectedCondition={setSelectedCondition}
                />
              </div>
            </div>
            <ConditionGroup
              conditions={conditions}
              selectedCondition={selectedCondition}
              setSelectedCondition={setSelectedCondition}
            />
            <CategorySlider
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              setInputValue={setInputValue}
              setSelectedCondition={setSelectedCondition}
            />
          </div>

          <Suspense fallback={<ProductLoadingState count={8} />}>
            {isLoading ? (
              <ProductLoadingState />
            ) : error ? (
              <ProductErrorState error={error} />
            ) : (products?.products.length ?? 0) > 0 ? (
              <ProductGrid products={products} />
            ) : (
              <ProductEmptyState />
            )}
          </Suspense>
        </TabsContent>

        {/* SELL SECTION */}
        <TabsContent value="sell" className="space-y-4 pt-4">
          {!user ? (
            <AuthRequiredAlert onClick={() => login()} />
          ) : !isTelegramLinked ? (
            <TelegramRequiredAlert />
          ) : (
            <ProductCreateForm
              handleCreate={handleCreate}
              isTelegramLinked={isTelegramLinked}
              uploadProgress={uploadProgress}
            />
          )}
        </TabsContent>

        {/* MY LISTINGS SECTION */}
        <TabsContent value="my-listings" className="space-y-6 pt-4">
          {!user ? (
            <AuthRequiredAlert
              description="view your listings."
              onClick={() => login()}
            />
          ) : (
            <>
              {/* Active Listings */}
              <ProductListingSection
                title="Active Listings"
                products={activeListings || []}
                emptyMessage="No active listings found."
                onProductClick={(productId) =>
                  navigate(`/apps/kupi-prodai/product/${productId}`)
                }
                onEditListing={handleEditListing}
                onDeleteListing={handleDelete}
                onToggleListingStatus={handleToggleProductStatus}
                getIsPendingToggleMutation={getIsPendingToggleMutation}
                getIsPendingDeleteMutation={getIsPendingDeleteMutation}
              />

              {/* Inactive Listings */}
              <ProductListingSection
                title="Inactive Listings"
                products={inactiveListings || []}
                emptyMessage="No inactive listings found."
                onProductClick={(productId) =>
                  navigate(`/apps/kupi-prodai/product/${productId}`)
                }
                onEditListing={handleEditListing}
                onDeleteListing={handleDelete}
                onToggleListingStatus={handleToggleProductStatus}
                getIsPendingToggleMutation={getIsPendingToggleMutation}
                getIsPendingDeleteMutation={getIsPendingDeleteMutation}
              />
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
                            <option key={category.title} value={category.title}>
                              {categories[index + 1].title}
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
                                <Trash2 className="h-4 w-4 text-foreground" />
                              </Button>
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
