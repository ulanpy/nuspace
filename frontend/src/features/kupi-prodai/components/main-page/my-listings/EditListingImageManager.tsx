"use client";

import React from "react";
import { Button } from "@/components/atoms/button";
import { ChevronLeft, ChevronRight, Trash2, Plus, ImageIcon } from "lucide-react";

interface EditListingImageManagerProps {
    previewImages: string[];
    currentMediaIndex: number;
    setCurrentMediaIndex: React.Dispatch<React.SetStateAction<number>>;
    handleImageDelete: () => void;
    dropZoneRef: React.RefObject<HTMLDivElement>;
    isDragging: boolean;
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function EditListingImageManager({
    previewImages,
    currentMediaIndex,
    setCurrentMediaIndex,
    handleImageDelete,
    dropZoneRef,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    fileInputRef,
    handleFileSelect
}: EditListingImageManagerProps) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="block text-sm font-medium">
                    Images
                </label>
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
                            <div className="absolute top-2 right-2 flex gap-1">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-background/80"
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleImageDelete();
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
    );
} 