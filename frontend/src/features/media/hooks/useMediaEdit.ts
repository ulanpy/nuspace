import { useMediaEditContext } from "@/context/MediaEditContext";
import { useMediaUploadContext } from "@/context/MediaUploadContext";

export const useMediaEdit = () => {
  const {
    mediaToDelete,
    originalMedia,
    reorderedMedia,
    currentMediaIndex,
    setMediaToDelete,
    setReorderedMedia,
    setCurrentMediaIndex,
  } = useMediaEditContext();
  
  const { 
    mediaFiles: imageFiles, 
    previewMedia: previewImages, 
    setMediaFiles: setImageFiles, 
    setPreviewMedia: setPreviewImages 
  } = useMediaUploadContext();
  
  
  const deleteExistingMedia = (mediaId: number) => {
    setMediaToDelete([...mediaToDelete, mediaId]);

    const newReorderedMedia =
      reorderedMedia.length > 0
        ? reorderedMedia.filter((m) => m.id !== mediaId)
        : originalMedia.filter((m) => m.id !== mediaId);
    setReorderedMedia(newReorderedMedia);

    if (
      currentMediaIndex >= newReorderedMedia.length &&
      newReorderedMedia.length > 0
    ) {
      setCurrentMediaIndex(newReorderedMedia.length - 1);
    }
  };

  const handleMediaDelete = (index: number, item?: any) => {
    // If index is less than originalMedia.length, it's an existing media item
    if (index < originalMedia.length) {
      const mediaToRemove = originalMedia[index];
      
      if (mediaToRemove) {
        // Mark for deletion on server
        deleteExistingMedia(mediaToRemove.id);
        
        // Remove from preview immediately for visual feedback
        const newPreviewImages = [...previewImages];
        newPreviewImages.splice(index, 1);
        setPreviewImages(newPreviewImages);
        
        // Update current media index if needed
        if (
          currentMediaIndex >= newPreviewImages.length &&
          newPreviewImages.length > 0
        ) {
          setCurrentMediaIndex(newPreviewImages.length - 1);
        } else if (currentMediaIndex >= newPreviewImages.length) {
          setCurrentMediaIndex(0);
        }
      }
    } else {
      // It's a new media item (index >= originalMedia.length)
      const newMediaIndex = index - originalMedia.length;
      const newImageFiles = [...imageFiles];
      const newPreviewImages = [...previewImages];
      
      newImageFiles.splice(newMediaIndex, 1);
      newPreviewImages.splice(index, 1);
      
      setImageFiles(newImageFiles);
      setPreviewImages(newPreviewImages);
      
      if (
        currentMediaIndex >= newPreviewImages.length &&
        newPreviewImages.length > 0
      ) {
        setCurrentMediaIndex(newPreviewImages.length - 1);
      } else if (currentMediaIndex >= newPreviewImages.length) {
        setCurrentMediaIndex(0);
      }
    }
  };
  return {
    deleteExistingMedia,
    handleMediaDelete,
  };
};
