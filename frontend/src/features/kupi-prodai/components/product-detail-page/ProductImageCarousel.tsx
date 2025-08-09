"use client";

import { Button } from "@/components/atoms/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Media } from "@/features/media/types/types";

interface ProductImageCarouselProps {
    productName: string;
    media: Media[];
    currentImageIndex: number;
    setCurrentImageIndex: (index: number) => void;
    openImageModal: () => void;
    prevImage: () => void;
    nextImage: () => void;
}

export function ProductImageCarousel({
    productName,
    media,
    currentImageIndex,
    setCurrentImageIndex,
    openImageModal,
    prevImage,
    nextImage
}: ProductImageCarouselProps) {

    const getPlaceholderImage = () => {
        if (
            media &&
            media.length > 0 &&
            media[currentImageIndex]?.url
        ) {
            return media[currentImageIndex].url;
        }
        return "https://placehold.co/400x400?text=No+Image";
    };

    return (
        <div className="relative">
            <div
                className="aspect-square rounded-lg overflow-hidden cursor-pointer"
                onClick={openImageModal}
            >
                <img
                    src={
                        media.length > 0
                            ? media[currentImageIndex]?.url
                            : getPlaceholderImage()
                    }
                    alt={productName}
                    className="w-full h-full object-contain"
                />
            </div>

            {media.length > 1 && (
                <>
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80"
                        onClick={(e) => {
                            e.stopPropagation();
                            prevImage();
                        }}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80"
                        onClick={(e) => {
                            e.stopPropagation();
                            nextImage();
                        }}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </>
            )}

            {media.length > 1 && (
                <div className="flex justify-center mt-4 gap-2">
                    {media.map((image, index) => (
                        <button
                            key={image.id}
                            className={`w-16 h-16 rounded-md overflow-hidden border-2 ${index === currentImageIndex
                                    ? "border-primary"
                                    : "border-transparent"
                                }`}
                            onClick={() => setCurrentImageIndex(index)}
                        >
                            <img
                                src={
                                    image.url || "https://placehold.co/400x400?text=No+Image"
                                }
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
} 