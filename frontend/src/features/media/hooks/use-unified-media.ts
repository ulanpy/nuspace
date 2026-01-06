import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedMediaContext } from '@/features/media/context/unified-media-context';
import { mediaApi } from '@/features/media/api/media-api';
import { compressMedia } from "@/features/media/utils/compress-media";
import { getSignedUrls } from "@/features/media/utils/get-signed-urls";
import { uploadMedia } from "@/features/media/utils/upload-media";
import { UploadMediaOptions } from "@/features/media/types/types";

export interface UnifiedMediaHookReturn {
  // State
  mediaFiles: File[];
  previewMedia: string[];
  originalMedia: any[];
  mediaToDelete: number[];
  isUploading: boolean;
  uploadProgress: number;
  isDragging: boolean;
  currentIndex: number;
  maxFiles?: number;
  recommendedAspectRatio?: string;
  recommendedDimensions?: string;
  recommendedNote?: string;
  
  // File operations
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  removeMedia: (index: number) => void;
  clearAllFiles: () => void;
  
  // Upload operations
  uploadFiles: (options: UploadMediaOptions) => Promise<boolean>;
  deleteMarkedMedia: () => Promise<boolean>;
  
  // Edit operations
  initializeExistingMedia: (media: any[]) => void;
  setMainMedia: (index: number) => void;
  
  // UI operations
  setCurrentMediaIndex: (index: number) => void;
  
  // Utility
  getTotalMediaCount: () => number;
  canAddMoreFiles: () => boolean;
  getValidationErrors: (files: File[]) => string[];
  reset: () => void;
}

export function useUnifiedMedia(): UnifiedMediaHookReturn {
  const { toast } = useToast();
  const context = useUnifiedMediaContext();
  
  const {
    mediaFiles,
    previewMedia,
    originalMedia,
    mediaToDelete,
    isUploading,
    uploadProgress,
    isDragging,
    currentIndex,
    config,
    addFiles,
    removeFile,
    clearFiles,
    setOriginalMedia,
    markForDeletion,
    unmarkForDeletion,
    setUploading,
    setProgress,
    setDragging,
    setCurrentIndex,
    reset: contextReset,
  } = context;

  // File selection and drag & drop handlers
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const errors = getValidationErrors(fileArray);
      
      if (errors.length > 0) {
        errors.forEach(error => {
          toast({
            title: "Invalid file",
            description: error,
            variant: "destructive",
          });
        });
        return;
      }
      
      addFiles(fileArray);
    }
    
    // Reset input value
    e.target.value = '';
  }, [addFiles, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, [setDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, [setDragging]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const errors = getValidationErrors(files);
      
      if (errors.length > 0) {
        errors.forEach(error => {
          toast({
            title: "Invalid file",
            description: error,
            variant: "destructive",
          });
        });
        return;
      }
      
      addFiles(files);
    }
  }, [addFiles, setDragging, toast]);

  // Media operations
  const removeMedia = useCallback((index: number) => {
    removeFile(index);
    
    toast({
      title: "Media removed",
      description: "The media item has been removed.",
    });
  }, [removeFile, toast]);

  const clearAllFiles = useCallback(() => {
    clearFiles();
    toast({
      title: "Files cleared",
      description: "All new files have been removed.",
    });
  }, [clearFiles, toast]);

  // Upload operations
  const uploadFiles = useCallback(async (options: UploadMediaOptions): Promise<boolean> => {
    if (mediaFiles.length === 0) {
      return true;
    }

    try {
      setUploading(true);
      setProgress(10);

      // Compress media first so that signed URLs and headers use final MIME
      const compressedMedia = await compressMedia(mediaFiles, false); // Disable debug toasts
      setProgress(30);

      // Get signed URLs for compressed files
      const signedUrls = await getSignedUrls(options.entityId, compressedMedia, {
        entity_type: options.entity_type,
        mediaFormat: options.mediaFormat,
        startOrder: options.startOrder || 0,
      });
      setProgress(50);

      // Upload media using headers matching compressed MIME types
      await uploadMedia(compressedMedia, signedUrls);
      setProgress(90);

      setProgress(100);
      
      toast({
        title: "Upload successful",
        description: `${mediaFiles.length} file(s) uploaded successfully.`,
      });

      return true;
    } catch (error) {
      console.error("Media upload failed:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload media files. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setUploading(false);
    }
  }, [mediaFiles, setUploading, setProgress, toast]);

  const deleteMarkedMedia = useCallback(async (): Promise<boolean> => {
    if (mediaToDelete.length === 0) {
      return true;
    }

    try {
      const success = await mediaApi.deleteMedia(mediaToDelete);
      
      if (success) {
        // Clear deletion marks locally so repeated submits don't re-delete
        mediaToDelete.forEach((id) => unmarkForDeletion(id));
        toast({
          title: "Media deleted",
          description: `${mediaToDelete.length} media item(s) deleted successfully.`,
        });
        return true;
      } else {
        throw new Error("Deletion failed");
      }
    } catch (error) {
      console.error("Media deletion failed:", error);
      toast({
        title: "Deletion failed",
        description: "Failed to delete media items. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [mediaToDelete, unmarkForDeletion, toast]);

  // Edit operations
  const initializeExistingMedia = useCallback((media: any[]) => {
    setOriginalMedia(media);
  }, [setOriginalMedia]);

  const setMainMedia = useCallback((index: number) => {
    // This would be implemented based on your main media logic
    // For now, just set the current index
    setCurrentIndex(index);
    
    toast({
      title: "Main media set",
      description: "The selected media has been set as the main image.",
    });
  }, [setCurrentIndex, toast]);

  // Utility functions
  const getTotalMediaCount = useCallback(() => {
    return originalMedia.length + mediaFiles.length;
  }, [originalMedia.length, mediaFiles.length]);

  const canAddMoreFiles = useCallback(() => {
    if (!config.maxFiles) return true;
    return getTotalMediaCount() < config.maxFiles;
  }, [config.maxFiles, getTotalMediaCount]);

  const getValidationErrors = useCallback((files: File[]): string[] => {
    const errors: string[] = [];
    
    files.forEach((file, index) => {
      // Check file type
      if (config.allowedTypes && config.allowedTypes.length > 0) {
        const isValidType = config.allowedTypes.some(type => 
          file.type.startsWith(type.toLowerCase()) || 
          file.name.toLowerCase().endsWith(`.${type.toLowerCase()}`)
        );
        if (!isValidType) {
          errors.push(`File "${file.name}" has invalid type. Allowed: ${config.allowedTypes.join(', ')}`);
        }
      }
      
      // Check file size
      if (config.maxFileSize) {
        const maxSizeBytes = config.maxFileSize * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          errors.push(`File "${file.name}" exceeds maximum size of ${config.maxFileSize}MB`);
        }
      }
    });
    
    // Check total file count
    if (config.maxFiles) {
      const totalAfterAdd = getTotalMediaCount() + files.length;
      if (totalAfterAdd > config.maxFiles) {
        errors.push(`Cannot add ${files.length} files. Maximum ${config.maxFiles} files allowed.`);
      }
    }
    
    return errors;
  }, [config, getTotalMediaCount]);

  const reset = useCallback(() => {
    contextReset();
    toast({
      title: "Media reset",
      description: "All media has been cleared.",
    });
  }, [contextReset, toast]);

  return {
    // State
    mediaFiles,
    previewMedia,
    originalMedia,
    mediaToDelete,
    isUploading,
    uploadProgress,
    isDragging,
    currentIndex,
    maxFiles: config.maxFiles,
    recommendedAspectRatio: config.recommendedAspectRatio,
    recommendedDimensions: config.recommendedDimensions,
    recommendedNote: config.recommendedNote,
    
    // File operations
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeMedia,
    clearAllFiles,
    
    // Upload operations
    uploadFiles,
    deleteMarkedMedia,
    
    // Edit operations
    initializeExistingMedia,
    setMainMedia,
    
    // UI operations
    setCurrentMediaIndex: setCurrentIndex,
    
    // Utility
    getTotalMediaCount,
    canAddMoreFiles,
    getValidationErrors,
    reset,
  };
}
