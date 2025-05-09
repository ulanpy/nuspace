// hooks/use-product-images.ts
import imageCompression from "browser-image-compression";
import { kupiProdaiApi, SignedUrlRequest } from "@/modules/kupi-prodai/api/kupi-prodai-api";
import { useImageContext } from "@/context/image-context";
import { useListingState } from "@/context/listing-context";

interface UploadImageOptions {
  media_table: string;
  entityId: number;
  mediaFormat: string;
  startOrder?: number;
}

export function useProductImages() {
  const {
    imageFiles,
    setImageFiles,
    setPreviewImages,
    setIsUploading
  } = useImageContext();
  const { setUploadProgress } = useListingState();

  // Сурет сығымдау функциясы
  const compressImages = async (files: File[]) => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    return Promise.all(
      files.map(async (imageFile) => {
        return await imageCompression(imageFile, options);
      })
    );
  };

  const getSignedUrls = async (
    entityId: number,
    files: File[],
    options: Omit<UploadImageOptions, 'entityId'>
  ) => {
    const requests: SignedUrlRequest[] = files.map((file, idx) => ({
      media_table: options.media_table,
      entity_id: entityId,
      media_format: options.mediaFormat,
      media_order: (options.startOrder || 0) + idx,
      mime_type: file.type,
      content_type: file.type,
    }));

    return await kupiProdaiApi.getSignedUrls(requests);
  };

  const uploadImages = async (files: File[], signedUrls: any[]) => {
    return Promise.all(
      files.map((file: File, i: number) => {
        const {
          upload_url,
          filename,
          media_table,
          entity_id,
          media_format,
          media_order,
          mime_type,
        } = signedUrls[i];

        const headers: Record<string, string> = {
          "x-goog-meta-filename": filename,
          "x-goog-meta-media-table": media_table,
          "x-goog-meta-entity-id": entity_id.toString(),
          "x-goog-meta-media-format": media_format,
          "x-goog-meta-media-order": media_order.toString(),
          "x-goog-meta-mime-type": mime_type,
          "Content-Type": mime_type,
        };

        return fetch(upload_url, {
          method: "PUT",
          headers,
          body: file,
        });
      })
    );
  };

  const handleImageUpload = async (options: UploadImageOptions) => {
    if (!imageFiles.length) return true;

    try {
      setIsUploading(true);
      setUploadProgress(30);

      // 1. Signed URLs алу
      const signedUrls = await getSignedUrls(
        options.entityId,
        imageFiles,
        {
          media_table: options.media_table,
          mediaFormat: options.mediaFormat,
          startOrder: options.startOrder
        }
      );

      const compressedImages = await compressImages(imageFiles);
      setUploadProgress(50);

      await uploadImages(compressedImages, signedUrls);
      setUploadProgress(90);

      setUploadProgress(100);
      return true;
    } catch (error) {
      console.error("Image upload failed:", error);
      return false;
    }
  };

  const deleteMedia = async (mediaIds: number[]) => {
    if (!mediaIds.length) return true;

    try {
      const deletePromises = mediaIds.map((mediaId) => {
        return fetch(`/api/bucket/delete?media_id=${mediaId}`, {
          method: "DELETE",
          credentials: "include",
        });
      });

      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error("Media deletion failed:", error);
      return false;
    }
  };

  // Жүктеу күйін қалпына келтіру
  const resetImageState = () => {
    setImageFiles([]);
    setPreviewImages?.([]);
    setIsUploading(false);
    setUploadProgress(0);
  };

  return {
    handleImageUpload,
    deleteMedia,
    resetImageState,
    compressImages,
  };
}