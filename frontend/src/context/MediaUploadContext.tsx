// MediaUploadContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

interface MediaUploadContextType {
  mediaFiles: File[];
  previewMedia: string[];
  isUploading: boolean;
  setMediaFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setPreviewMedia: React.Dispatch<React.SetStateAction<string[]>>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Context for managing media upload state
 * @param mediaFiles - Array of media files
 * @param previewMedia - Array of preview media
 * @param isUploading - Boolean indicating if upload is in progress
 * @param setMediaFiles - Function to set media files
 */


const MediaUploadContext = createContext<MediaUploadContextType | undefined>(undefined);

export const MediaUploadProvider = ({ children }: { children: ReactNode }) => {
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previewMedia, setPreviewMedia] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  return (
    <MediaUploadContext.Provider
      value={{
        mediaFiles: mediaFiles,
        previewMedia: previewMedia,
        isUploading: isUploading,
        setMediaFiles: setMediaFiles,
        setPreviewMedia: setPreviewMedia,
        setIsUploading: setIsUploading,
      }}
    >
      {children}
    </MediaUploadContext.Provider>
  );
};

export const useMediaUploadContext = () => {
  const context = useContext(MediaUploadContext);
  if (!context) {
    throw new Error("useMediaUploadContext must be used within an MediaUploadProvider");
  }
  return context;
};
