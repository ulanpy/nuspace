import { useImageContext } from "@/context/image-context";
import { useMediaContext } from "@/context/media-context";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const useImage = () => {
  const { toast } = useToast();
  const {
    mediaToDelete,
    originalMedia,
    reorderedMedia,
    currentMediaIndex,
    setMediaToDelete,
    setReorderedMedia,
    setCurrentMediaIndex,
  } = useMediaContext();
  const {
    imageFiles,
    setImageFiles,
    previewImages,
    setPreviewImages,
    isUploading,
    setIsUploading,
  } = useImageContext();
  const [isDragging, setIsDragging] = useState(false);
  const removeImage = (index: number) => {
    const newPreviewImages = [...previewImages];
    const newImageFiles = [...imageFiles];
    newPreviewImages.splice(index, 1);
    newImageFiles.splice(index, 1);
    setPreviewImages(newPreviewImages);
    setImageFiles(newImageFiles);
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  const handleDeleteImage = (mediaId: number) => {
    // Add the media ID to the list of media to delete
    setMediaToDelete([...mediaToDelete, mediaId]);

    // Remove the image from the preview images
    const mediaIndex = originalMedia.findIndex((m) => m.id === mediaId);
    if (mediaIndex !== -1) {
      const newPreviewImages = [...previewImages];
      newPreviewImages.splice(mediaIndex, 1);
      setPreviewImages(newPreviewImages);

      // Update reordered media
      const newReorderedMedia =
        reorderedMedia.length > 0
          ? reorderedMedia.filter((m) => m.id !== mediaId)
          : originalMedia.filter((m) => m.id !== mediaId);
      setReorderedMedia(newReorderedMedia);

      // Adjust current index if needed
      if (
        currentMediaIndex >= newPreviewImages.length &&
        newPreviewImages.length > 0
      ) {
        setCurrentMediaIndex(newPreviewImages.length - 1);
      }
    }
  };

  // Process files for upload
  const processFiles = (files: File[]) => {
    const newPreviewImages = [...previewImages];
    const newImageFiles = [...imageFiles];

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviewImages.push(reader.result as string);
          newImageFiles.push(file);
          setPreviewImages([...newPreviewImages]);
          setImageFiles([...newImageFiles]);
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Only image files are allowed",
          variant: "destructive",
        });
      }
    });
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };
  return {
    imageFiles,
    previewImages,
    isDragging,
    isUploading,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeImage,
    setIsUploading,
    handleImageUpload,
    handleDeleteImage,
    processFiles,
  };
};
