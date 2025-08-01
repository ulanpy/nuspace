"use client"

import { useState } from "react";
import { useUserProducts } from "@/modules/kupi-prodai/api/hooks/useUserProducts";
import { useDeleteProduct } from "@/modules/kupi-prodai/api/hooks/useDeleteProduct";
import { useUpdateProduct } from "@/modules/kupi-prodai/api/hooks/useUpdateProduct";
import { useToggleProduct } from "@/modules/kupi-prodai/api/hooks/useToggleProduct";
import { useEditModal } from "@/modules/kupi-prodai/hooks/useEditModal";
import { useListingState } from "@/context/ListingContext";
import { ProductListingSection } from "@/components/organisms/kp/ProductListingSection";
import { AuthRequiredAlert } from "@/components/molecules/auth-required-alert";
import { useUser } from "@/hooks/use-user";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";
import { Button } from "@/components/atoms/button";
import { X, RefreshCw, ChevronLeft, ChevronRight, Trash2, Plus, ImageIcon } from "lucide-react";
import { Input } from "@/components/atoms/input";
import { useMediaEditContext } from "@/context/MediaEditContext";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useMediaEdit } from "@/modules/media/hooks/useMediaEdit";
import { useMediaSelection } from "@/modules/media/hooks/useMediaSelection";
import { useProduct } from "@/components/molecules/form/use-product";
import { Progress } from "@/components/atoms/progress";
import React from "react";

export function MyListingsSection() {
    const navigate = useNavigate();
    const { user, login } = useUser();
    const { myProducts } = useUserProducts();
    const { getIsPendingDeleteMutation, handleDelete } = useDeleteProduct();
    const { handleUpdateListing } = useUpdateProduct();
    const { handleToggleProductStatus, getIsPendingToggleMutation } = useToggleProduct();
    const { handleEditListing, closeEditModal } = useEditModal();
    const { newListing, showEditModal, uploadProgress } = useListingState();
    const { isUploading, mediaFiles: imageFiles, previewMedia: previewImages, setMediaFiles: setImageFiles, setPreviewMedia: setPreviewImages } = useMediaUploadContext();
    const { originalMedia, currentMediaIndex, setCurrentMediaIndex } = useMediaEditContext();
    const { handleDragOver, handleDragLeave, handleDrop, handleFileSelect } = useMediaSelection();
    const { deleteExistingMedia } = useMediaEdit();
    const { conditions, categories, handleInputChange, handlePriceInputBlur, handlePriceInputFocus, handleSelectChange } = useProduct();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const dropZoneRef = React.useRef<HTMLDivElement>(null);
    const [isDragging] = useState(false);
    const displayConditions = ["All Conditions", "New", "Used"];

    const activeListings = myProducts?.products?.filter((p) => p.status === "active");
    const inactiveListings = myProducts?.products?.filter((p) => p.status === "inactive");

    if (!user) {
        return <AuthRequiredAlert description="view your listings." onClick={() => login()} />;
    }

    return (
        <div className="space-y-6 pt-4">
            <ProductListingSection
                title="Active Listings"
                products={activeListings as Types.Product[] || []}
                emptyMessage="No active listings found."
                onProductClick={(productId) =>
                    navigate(ROUTES.APPS.KUPI_PRODAI.PRODUCT.DETAIL_FN(productId.toString()))
                }
                onEditListing={handleEditListing}
                onDeleteListing={handleDelete}
                onToggleListingStatus={handleToggleProductStatus}
                getIsPendingToggleMutation={getIsPendingToggleMutation}
                getIsPendingDeleteMutation={getIsPendingDeleteMutation}
            />

            <ProductListingSection
                title="Inactive Listings"
                products={inactiveListings as Types.Product[] || []}
                emptyMessage="No inactive listings found."
                onProductClick={(productId) =>
                    navigate(ROUTES.APPS.KUPI_PRODAI.PRODUCT.DETAIL_FN(productId.toString()))
                }
                onEditListing={handleEditListing}
                onDeleteListing={handleDelete}
                onToggleListingStatus={handleToggleProductStatus}
                getIsPendingToggleMutation={getIsPendingToggleMutation}
                getIsPendingDeleteMutation={getIsPendingDeleteMutation}
            />

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
                                        {/* Name, Description, Price, Category, Condition */}
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
                                                                                : prev - 1,
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
                                                                                : prev + 1,
                                                                        );
                                                                    }}
                                                                    type="button"
                                                                >
                                                                    <ChevronRight className="h-4 w-4" />
                                                                </Button>
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
                                                                            m.url ===
                                                                            previewImages[currentMediaIndex],
                                                                    );
                                                                    if (mediaToRemove) {
                                                                        deleteExistingMedia(mediaToRemove.id);
                                                                    } else {
                                                                        // This is a newly added image
                                                                        const newImageFiles = [...imageFiles];
                                                                        const newPreviewImages = [...previewImages];
                                                                        newImageFiles.splice(
                                                                            currentMediaIndex - originalMedia.length,
                                                                            1,
                                                                        );
                                                                        newPreviewImages.splice(
                                                                            currentMediaIndex,
                                                                            1,
                                                                        );
                                                                        setImageFiles(newImageFiles);
                                                                        setPreviewImages(newPreviewImages);
                                                                        if (
                                                                            currentMediaIndex >=
                                                                            newPreviewImages.length &&
                                                                            newPreviewImages.length > 0
                                                                        ) {
                                                                            setCurrentMediaIndex(
                                                                                newPreviewImages.length - 1,
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
                                                    </div>
                                                )}
                                            </div>

                                            {/* Add new images */}
                                            <div
                                                ref={dropZoneRef}
                                                className={`border-2 ${isDragging ? "border-primary" : "border-dashed"
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
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        className="hidden"
                                                        accept="image/*"
                                                        multiple
                                                        onChange={handleFileSelect}
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