// ImageContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

interface ImageContextType {
  imageFiles: File[];
  previewImages: string[];
  isUploading: boolean;
  setImageFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setPreviewImages: React.Dispatch<React.SetStateAction<string[]>>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export const ImageProvider = ({ children }: { children: ReactNode }) => {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  return (
    <ImageContext.Provider
      value={{
        imageFiles,
        previewImages,
        isUploading,
        setImageFiles,
        setPreviewImages,
        setIsUploading,
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
