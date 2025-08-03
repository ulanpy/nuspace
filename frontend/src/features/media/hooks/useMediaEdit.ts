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

  const handleMediaDelete = () => {
    const mediaToRemove = originalMedia.find(
        (m) =>
            m.url ===
            previewImages[currentMediaIndex],
    );
    if (mediaToRemove) {
        deleteExistingMedia(mediaToRemove.id);
    } else {
        const newImageFiles = [...imageFiles];
        const newPreviewImages = [...previewImages];
        newImageFiles.splice(
            currentMediaIndex - originalMedia.length,
            1,
        );
        newPreviewImages.splice(
            currentMediaIndex,
            1,
        );
        setImageFiles(newImageFiles);
        setPreviewImages(newPreviewImages);
        if (
            currentMediaIndex >=
            newPreviewImages.length &&
            newPreviewImages.length > 0
        ) {
            setCurrentMediaIndex(
                newPreviewImages.length - 1,
            );
        }
    }
};
  return {
    deleteExistingMedia,
    handleMediaDelete,
  };
};
