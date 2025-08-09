import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { MediaItem } from "@/features/media/types/media";
import { EntityType, MediaFormat } from "@/features/media/types/types";

export interface MediaConfig {
  entityType: EntityType;
  mediaFormat: MediaFormat;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  enableMainSelection?: boolean;
  enablePreview?: boolean;
  enableReordering?: boolean;
  // UX hints for best results
  recommendedAspectRatio?: string; // e.g. "1:1", "3:4", "16:9"
  recommendedDimensions?: string; // e.g. "min 1080x1080"
  recommendedNote?: string; // free-text tip shown to users
}

export interface MediaState {
  // Files and previews
  mediaFiles: File[];
  previewMedia: string[];
  
  // Edit mode (existing media)
  originalMedia: MediaItem[];
  mediaToDelete: number[];
  
  // UI state
  isUploading: boolean;
  uploadProgress: number;
  isDragging: boolean;
  currentIndex: number;
  
  // Configuration
  config: MediaConfig;
}

export interface MediaActions {
  // File operations
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  
  // Edit operations
  setOriginalMedia: (media: MediaItem[]) => void;
  markForDeletion: (mediaId: number) => void;
  unmarkForDeletion: (mediaId: number) => void;
  
  // UI operations
  setUploading: (uploading: boolean) => void;
  setProgress: (progress: number) => void;
  setDragging: (dragging: boolean) => void;
  setCurrentIndex: (index: number) => void;
  
  // Configuration
  updateConfig: (config: Partial<MediaConfig>) => void;
  
  // Reset
  reset: () => void;
}

export interface UnifiedMediaContextType extends MediaState, MediaActions {}

const UnifiedMediaContext = createContext<UnifiedMediaContextType | undefined>(undefined);

interface UnifiedMediaProviderProps {
  children: ReactNode;
  config: MediaConfig;
}

export function UnifiedMediaProvider({ children, config }: UnifiedMediaProviderProps) {
  // State
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previewMedia, setPreviewMedia] = useState<string[]>([]);
  const [originalMedia, setOriginalMediaState] = useState<MediaItem[]>([]);
  const [mediaToDelete, setMediaToDeleteState] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mediaConfig, setMediaConfig] = useState<MediaConfig>(config);

  // Actions
  const addFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(file => {
      // Check file type
      if (mediaConfig.allowedTypes && mediaConfig.allowedTypes.length > 0) {
        const isValidType = mediaConfig.allowedTypes.some(type => 
          file.type.startsWith(type.toLowerCase()) || 
          file.name.toLowerCase().endsWith(`.${type.toLowerCase()}`)
        );
        if (!isValidType) return false;
      }
      
      // Check file size
      if (mediaConfig.maxFileSize) {
        const maxSizeBytes = mediaConfig.maxFileSize * 1024 * 1024;
        if (file.size > maxSizeBytes) return false;
      }
      
      return true;
    });

    // Check max files limit
    const currentTotal = mediaFiles.length + originalMedia.length;
    const availableSlots = mediaConfig.maxFiles ? mediaConfig.maxFiles - currentTotal : Infinity;
    const filesToAdd = validFiles.slice(0, availableSlots);

    if (filesToAdd.length > 0) {
      setMediaFiles(prev => [...prev, ...filesToAdd]);
      
      // Generate previews
      filesToAdd.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewMedia(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  }, [mediaFiles.length, originalMedia.length, mediaConfig]);

  const removeFile = useCallback((index: number) => {
    const totalExisting = originalMedia.length;
    
    if (index < totalExisting) {
      // Removing existing media
      const mediaItem = originalMedia[index];
      if (mediaItem.id) {
        setMediaToDeleteState(prev => [...prev, mediaItem.id as number]);
      }
      setOriginalMediaState(prev => prev.filter((_, i) => i !== index));
    } else {
      // Removing new file
      const newFileIndex = index - totalExisting;
      setMediaFiles(prev => prev.filter((_, i) => i !== newFileIndex));
    }
    
    // Remove from preview
    setPreviewMedia(prev => prev.filter((_, i) => i !== index));
    
    // Adjust current index
    if (currentIndex >= index) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  }, [originalMedia, currentIndex]);

  const clearFiles = useCallback(() => {
    setMediaFiles([]);
    setPreviewMedia(originalMedia.map(item => item.url));
  }, [originalMedia]);

  const setOriginalMedia = useCallback((media: MediaItem[]) => {
    setOriginalMediaState(media);
    setPreviewMedia(media.map(item => item.url));
    setCurrentIndex(0);
  }, []);

  const markForDeletion = useCallback((mediaId: number) => {
    setMediaToDeleteState(prev => [...prev, mediaId]);
  }, []);

  const unmarkForDeletion = useCallback((mediaId: number) => {
    setMediaToDeleteState(prev => prev.filter(id => id !== mediaId));
  }, []);

  const setUploading = useCallback((uploading: boolean) => {
    setIsUploading(uploading);
    if (!uploading) {
      setUploadProgress(0);
    }
  }, []);

  const setProgress = useCallback((progress: number) => {
    setUploadProgress(Math.max(0, Math.min(100, progress)));
  }, []);

  const setDragging = useCallback((dragging: boolean) => {
    setIsDragging(dragging);
  }, []);

  const updateConfig = useCallback((newConfig: Partial<MediaConfig>) => {
    setMediaConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const reset = useCallback(() => {
    setMediaFiles([]);
    setPreviewMedia([]);
    setOriginalMediaState([]);
    setMediaToDeleteState([]);
    setIsUploading(false);
    setUploadProgress(0);
    setIsDragging(false);
    setCurrentIndex(0);
  }, []);

  const contextValue: UnifiedMediaContextType = {
    // State
    mediaFiles,
    previewMedia,
    originalMedia,
    mediaToDelete,
    isUploading,
    uploadProgress,
    isDragging,
    currentIndex,
    config: mediaConfig,
    
    // Actions
    addFiles,
    removeFile,
    clearFiles,
    setOriginalMedia,
    markForDeletion,
    unmarkForDeletion,
    setUploading,
    setProgress,
    setDragging,
    setCurrentIndex: setCurrentIndex,
    updateConfig,
    reset,
  };

  return (
    <UnifiedMediaContext.Provider value={contextValue}>
      {children}
    </UnifiedMediaContext.Provider>
  );
}

export function useUnifiedMediaContext() {
  const context = useContext(UnifiedMediaContext);
  if (!context) {
    throw new Error("useUnifiedMediaContext must be used within a UnifiedMediaProvider");
  }
  return context;
}
