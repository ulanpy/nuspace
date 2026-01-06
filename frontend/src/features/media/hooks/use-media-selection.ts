import { useMediaUploadContext } from '@/context/media-upload-context';
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const useMediaSelection = () => {
  const { toast } = useToast();
  const {
    mediaFiles,
    setMediaFiles,
    previewMedia,
    setPreviewMedia,
  } = useMediaUploadContext();

  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (files: File[]) => {
    const newPreviewMedia = [...previewMedia];
    const newMediaFiles = [...mediaFiles];

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviewMedia.push(reader.result as string);
          newMediaFiles.push(file);
          setPreviewMedia([...newPreviewMedia]);
          setMediaFiles([...newMediaFiles]);
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

  const removeNewMedia = (index: number) => {
    const newPreviewMedia = [...previewMedia];
    const newMediaFiles = [...mediaFiles];
    newPreviewMedia.splice(index, 1);
    newMediaFiles.splice(index, 1);
    setPreviewMedia(newPreviewMedia);
    setMediaFiles(newMediaFiles);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
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
    mediaFiles,
    previewMedia,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeNewMedia,
    handleFileSelect,
  };
}; 