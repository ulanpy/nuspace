import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useListingState } from "@/context/ListingContext";
import { compressMedia } from "../utils/compress-media";
import { UploadMediaOptions } from "../types/types";
import { getSignedUrls } from "../utils/get-signed-urls";
import { uploadMedia } from "../utils/upload-media";
import { SignedUrlResponse } from "../types/types";


export function useMediaUpload() {
    const { mediaFiles, setMediaFiles, setPreviewMedia, setIsUploading, isUploading } =
      useMediaUploadContext();
    const { setUploadProgress } = useListingState();

  
    const handleMediaUpload = async (options: UploadMediaOptions) => {
      if (!mediaFiles.length) return true;
  
      try {
        setIsUploading(true);
        setUploadProgress(30);
  
        // 1. Signed URLs алу
        const signedUrls: SignedUrlResponse[] = await getSignedUrls(
          options.entityId, mediaFiles, {
          entity_type: options.entity_type,
          mediaFormat: options.mediaFormat,
          startOrder: options.startOrder,
        });
  
        const compressedMedia: File[] = await compressMedia(mediaFiles);
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
      setMediaFiles([]);
      setPreviewMedia?.([]);
      setIsUploading(false);
      setUploadProgress(0);
    };
  
    return {
      handleMediaUpload,
      resetMediaState,
      isUploading
    };
  }
  