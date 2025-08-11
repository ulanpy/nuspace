"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/atoms/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Media } from "@/features/media/types/types";
import { useMaybeBackNavigation } from "@/context/BackNavigationContext";

interface ImageViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: Media[];
    currentImageIndex: number;
    prevImage: () => void;
    nextImage: () => void;
    productName: string;
}

export function ImageViewerModal({ isOpen, onClose, images, currentImageIndex, prevImage, nextImage, productName }: ImageViewerModalProps) {
    const [zoomLevel, setZoomLevel] = React.useState(1);
    const backNav = useMaybeBackNavigation();

    useEffect(() => {
        if (!isOpen || !backNav) return;
        const unregister = backNav.register(onClose);
        return unregister;
    }, [isOpen, backNav, onClose]);

    const handleZoom = (factor: number) => {
        setZoomLevel((prev) => {
            const newZoom = prev + factor;
            return Math.min(Math.max(newZoom, 0.5), 3); // Limit zoom between 0.5x and 3x
        });
    };

    if (!isOpen) {
        return null;
    }

    const currentImage = images[currentImageIndex];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
            onClick={onClose}
        >
            <div
                className="relative w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 z-10"
                    onClick={onClose}
                >
                    <X className="h-6 w-6" />
                </Button>

                {images.length > 1 && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 z-10"
                            onClick={prevImage}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 z-10"
                            onClick={nextImage}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white bg-black/50 hover:bg-black/70"
                        onClick={() => handleZoom(-0.5)}
                    >
                        Zoom Out
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white bg-black/50 hover:bg-black/70"
                        onClick={() => handleZoom(0.5)}
                    >
                        Zoom In
                    </Button>
                </div>

                <div
                    className="w-full h-full flex items-center justify-center overflow-auto"
                    style={{ cursor: "move" }}
                >
                    <img
                        src={currentImage?.url || "https://placehold.co/400x400?text=No+Image"}
                        alt={productName}
                        className="max-w-none"
                        style={{
                            transform: `scale(${zoomLevel})`,
                            transition: "transform 0.2s ease-out",
                        }}
                    />
                </div>
            </div>
        </div>
    );
} 