"use client"

import React from "react";
import { useUpdateProduct } from "@/features/marketplace/api/hooks/useUpdateProduct";
import { useEditModal } from "@/features/marketplace/hooks/useEditModal";
import { useListingState } from "@/context/ListingContext";
import { Button } from "@/components/atoms/button";
import { X } from "lucide-react";
import { UnifiedMediaProvider } from "@/features/media/context/UnifiedMediaContext";
import { UnifiedMediaUploadZone } from "@/components/organisms/media/UnifiedMediaUploadZone";
import { useUnifiedMedia } from "@/features/media/hooks/useUnifiedMedia";
import { getMediaConfig } from "@/features/media/config/mediaConfigs";
import { useMediaEditContext } from "@/context/MediaEditContext";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { EditListingForm } from "./EditListingForm";
import { useProductForm } from "@/features/marketplace/hooks/useProductForm";
// import { Progress } from "@/components/atoms/progress";

// Bridge component to connect unified system with legacy contexts
function EditListingMediaBridge() {
  const { setPreviewMedia, setMediaFiles, setIsUploading } = useMediaUploadContext();
  const { originalMedia, setMediaToDelete } = useMediaEditContext();
  // const { uploadProgress } = useListingState();
  
  const {
    previewMedia,
    mediaFiles,
    isUploading,
    initializeExistingMedia,
    mediaToDelete,
  } = useUnifiedMedia();

  // Sync with legacy contexts
  React.useEffect(() => {
    setPreviewMedia(previewMedia);
  }, [previewMedia, setPreviewMedia]);

  React.useEffect(() => {
    setMediaFiles(mediaFiles);
  }, [mediaFiles, setMediaFiles]);

  React.useEffect(() => {
    setIsUploading(isUploading);
  }, [isUploading, setIsUploading]);

  React.useEffect(() => {
    setMediaToDelete(mediaToDelete);
  }, [mediaToDelete, setMediaToDelete]);

  // Initialize existing media
  React.useEffect(() => {
    if (originalMedia.length > 0) {
      initializeExistingMedia(originalMedia);
    }
  }, [originalMedia, initializeExistingMedia]);

  return (
    <div className="space-y-4">
      <UnifiedMediaUploadZone
        label="Product Images"
        title="Upload product images"
        description="Add high-quality images of your product"
        layout="vertical"
        columns={4}
        showMainIndicator={true}
        enablePreview={true}
        enableReordering={false}
        showDropZoneWhenHasItems={true}
        dropZoneVariant="compact"
        progressVariant="standalone"
      />
      
      {/* Unified zone now renders progress consistently; remove duplicate legacy bar */}
    </div>
  );
}

export function UnifiedEditListingModal() {
    const { handleUpdateListing } = useUpdateProduct();
    const { closeEditModal } = useEditModal();
    const { newListing, showEditModal, uploadProgress } = useListingState();
    const { conditions, categories, handleInputChange, handlePriceInputBlur, handlePriceInputFocus, handleSelectChange } = useProductForm();
    const displayConditions = ["All Conditions", "New", "Used"];

    const config = getMediaConfig('marketplaceProducts');

    if (!showEditModal) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[11000] overflow-y-auto">
            <div
                className="flex items-center justify-center min-h-screen px-4 py-6 text-center"
            >
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

                    <form
                        onSubmit={handleUpdateListing}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <EditListingForm
                                newListing={newListing}
                                categories={categories}
                                conditions={conditions}
                                handleInputChange={handleInputChange}
                                handlePriceInputFocus={handlePriceInputFocus}
                                handlePriceInputBlur={handlePriceInputBlur}
                                handleSelectChange={handleSelectChange}
                                displayConditions={displayConditions}
                            />
                            
                            <UnifiedMediaProvider config={config}>
                                <EditListingMediaBridge />
                            </UnifiedMediaProvider>
                        </div>
                        
                        <div
                            className="flex justify-end gap-2 pt-4 border-t"
                        >
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditModal}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={uploadProgress > 0}
                                className="min-w-[120px]"
                            >
                                {uploadProgress > 0 ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Updating...
                                    </div>
                                ) : (
                                    "Update Listing"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
