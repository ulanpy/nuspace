"use client"

import React from "react";
import { useUpdateProduct } from "@/modules/kupi-prodai/api/hooks/useUpdateProduct";
import { useEditModal } from "@/modules/kupi-prodai/hooks/useEditModal";
import { useListingState } from "@/context/ListingContext";
import { Button } from "@/components/atoms/button";
import { X, RefreshCw } from "lucide-react";
import { useMediaEditContext } from "@/context/MediaEditContext";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useMediaEdit } from "@/modules/media/hooks/useMediaEdit";
import { useMediaSelection } from "@/modules/media/hooks/useMediaSelection";
import { useProduct } from "@/components/molecules/form/use-product";
import { Progress } from "@/components/atoms/progress";
import { EditListingForm } from "./EditListingForm";
import { EditListingImageManager } from "./EditListingImageManager";

export function EditListingModal() {
    const { handleUpdateListing } = useUpdateProduct();
    const { closeEditModal } = useEditModal();
    const { newListing, showEditModal, uploadProgress } = useListingState();
    const { currentMediaIndex, setCurrentMediaIndex } = useMediaEditContext();
    const { previewMedia: previewImages, isUploading } = useMediaUploadContext();
    const { isDragging, handleDragOver, handleDragLeave, handleDrop, handleFileSelect } = useMediaSelection();
    const { handleImageDelete } = useMediaEdit();
    const { conditions, categories, handleInputChange, handlePriceInputBlur, handlePriceInputFocus, handleSelectChange } = useProduct();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const dropZoneRef = React.useRef<HTMLDivElement>(null);
    const displayConditions = ["All Conditions", "New", "Used"];

    

    if (!showEditModal) {
        return null;
    }

    return (
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
                            <EditListingImageManager
                                previewImages={previewImages}
                                currentMediaIndex={currentMediaIndex}
                                setCurrentMediaIndex={setCurrentMediaIndex}
                                handleImageDelete={handleImageDelete}
                                dropZoneRef={dropZoneRef}
                                isDragging={isDragging}
                                handleDragOver={handleDragOver}
                                handleDragLeave={handleDragLeave}
                                handleDrop={handleDrop}
                                fileInputRef={fileInputRef}
                                handleFileSelect={handleFileSelect}
                            />
                        </div>
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
    );
} 