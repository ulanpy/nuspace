// ImageContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

interface ImageContextType {
  imageFiles: File[];
  previewImages: string[];
  isUploading: boolean;
  setImageFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setPreviewImages: React.Dispatch<React.SetStateAction<string[]>>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  removeImage: (index: number) => void;
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export const ImageProvider = ({ children }: { children: ReactNode }) => {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const removeImage = (index: number) => {
    const newPreviewImages = [...previewImages];
    const newImageFiles = [...imageFiles];
    newPreviewImages.splice(index, 1);
    newImageFiles.splice(index, 1);
    setPreviewImages(newPreviewImages);
    setImageFiles(newImageFiles);
  };
  return (
    <ImageContext.Provider
      value={{
        imageFiles,
        previewImages,
        isUploading,
        setImageFiles,
        setPreviewImages,
        setIsUploading,
        removeImage,
      }}
    >
      {children}
    </ImageContext.Provider>
  );
};

export const useImageContext = () => {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error("useImageContext must be used within an ImageProvider");
  }
  return context;
};
