import { useImageContext } from "@/context/image-context";
import { useListingState } from "@/context/listing-context";
import { compressMedia } from "../utils/compress-media";
import { UploadMediaOptions } from "../types/upload.types";
import { getSignedUrls } from "../utils/get-signed-urls";
import { deleteMedia } from "../utils/delete-media";
import { uploadMedia } from "../utils/upload-media";


export function useMediaUpload() {
    const { imageFiles, setImageFiles, setPreviewImages, setIsUploading } =
      useImageContext();
    const { setUploadProgress } = useListingState();

  
    const handleMediaUpload = async (options: UploadMediaOptions) => {
      if (!imageFiles.length) return true;
  
      try {
        setIsUploading(true);
        setUploadProgress(30);
  
        // 1. Signed URLs алу
        const signedUrls = await getSignedUrls(options.entityId, imageFiles, {
          entity_type: options.entity_type,
          mediaFormat: options.mediaFormat,
          startOrder: options.startOrder,
        });
  
        const compressedMedia: File[] = await compressMedia(imageFiles);
        setUploadProgress(50);
  
        await uploadMedia(compressedMedia, signedUrls);
        setUploadProgress(90);
  
        setUploadProgress(100);
        return true;
      } catch (error) {
        console.error("Media upload failed:", error);
        return false;
      }
    };
  
    // Жүктеу күйін қалпына келтіру
    const resetMediaState = () => {
      setImageFiles([]);
      setPreviewImages?.([]);
      setIsUploading(false);
      setUploadProgress(0);
    };
  
    return {
      handleMediaUpload,
      deleteMedia,
      resetMediaState
    };
  }
  