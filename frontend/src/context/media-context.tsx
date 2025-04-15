// MediaContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

interface ProductMedia {
  id: number;
  url: string;
  // Қажет болса, басқа да өрістерді қосыңыз
}

interface MediaContextType {
  originalMedia: ProductMedia[];
  mediaToDelete: number[];
  currentMediaIndex: number;
  reorderedMedia: ProductMedia[];
  setOriginalMedia: React.Dispatch<React.SetStateAction<ProductMedia[]>>;
  setMediaToDelete: React.Dispatch<React.SetStateAction<number[]>>;
  setCurrentMediaIndex: React.Dispatch<React.SetStateAction<number>>;
  setReorderedMedia: React.Dispatch<React.SetStateAction<ProductMedia[]>>;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export const MediaProvider = ({ children }: { children: ReactNode }) => {
  const [originalMedia, setOriginalMedia] = useState<ProductMedia[]>([]);
  const [mediaToDelete, setMediaToDelete] = useState<number[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [reorderedMedia, setReorderedMedia] = useState<ProductMedia[]>([]);

  return (
    <MediaContext.Provider
      value={{
        originalMedia,
        mediaToDelete,
        currentMediaIndex,
        reorderedMedia,
        setOriginalMedia,
        setMediaToDelete,
        setCurrentMediaIndex,
        setReorderedMedia,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
};

export const useMediaContext = () => {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error("useMediaContext must be used within a MediaProvider");
  }
  return context;
};
