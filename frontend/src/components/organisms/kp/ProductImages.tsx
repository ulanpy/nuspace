"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductImage {
  url: string;
}

interface ProductImagesProps {
  images: ProductImage[];
}

export const ProductImages = ({ images }: ProductImagesProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const getPlaceholderImage = () => {
    if (images && images.length > 0 && images[currentImageIndex]?.url) {
      return images[currentImageIndex].url;
    }
    return "https://placehold.co/400x400?text=No+Image";
  };

  return (
    <div className="relative">
      <img
        src={getPlaceholderImage()}
        alt="Product"
        className="w-full h-auto object-cover rounded-lg shadow-lg"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-gray-800 text-white p-2 rounded-full"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextImage}
            className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-gray-800 text-white p-2 rounded-full"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );
}; 