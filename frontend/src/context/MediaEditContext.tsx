// MediaEditContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import { MediaFormat } from "@/features/media/types/types";

interface MediaItem {
  id: number;
  url: string;
  order: string;
  media_format?: MediaFormat;
}

interface MediaEditContextType {
  originalMedia: MediaItem[];
  mediaToDelete: number[];
  currentMediaIndex: number;
  reorderedMedia: MediaItem[];
  setOriginalMedia: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  setMediaToDelete: React.Dispatch<React.SetStateAction<number[]>>;
  setCurrentMediaIndex: React.Dispatch<React.SetStateAction<number>>;
  setReorderedMedia: React.Dispatch<React.SetStateAction<MediaItem[]>>;
}

const MediaEditContext = createContext<MediaEditContextType | undefined>(undefined);

export const MediaEditProvider = ({ children }: { children: ReactNode }) => {
  const [originalMedia, setOriginalMedia] = useState<MediaItem[]>([]);
  const [mediaToDelete, setMediaToDelete] = useState<number[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [reorderedMedia, setReorderedMedia] = useState<MediaItem[]>([]);

  return (
    <MediaEditContext.Provider
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
    </MediaEditContext.Provider>
  );
};

export const useMediaEditContext = () => {
  const context = useContext(MediaEditContext);
  if (!context) {
    throw new Error("useMediaEditContext must be used within a MediaEditProvider");
  }
  return context;
};
