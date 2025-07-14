import {
  kupiProdaiApi,
  SignedUrlRequest,
} from "@/modules/kupi-prodai/api/kupi-prodai-api";
import { useImageContext } from "@/context/image-context";
import { useListingState } from "@/context/listing-context";

interface UploadImageOptions {
  entity_type: string;
  entityId: number;
  mediaFormat: string;
  startOrder?: number;
}

export function useProductImages() {
  const { imageFiles, setImageFiles, setPreviewImages, setIsUploading } =
    useImageContext();
  const { setUploadProgress } = useListingState();

  // Сурет сығымдау функциясы
  const compressImages = async (files: File[]): Promise<File[]> => {
    return Promise.all(
      files.map(async (imageFile) => {
        console.log('imageFile.size', imageFile.size);
        return new Promise<File>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) {
                console.log(blob, blob.size);
                const file = new File([blob], 'compressed.webp', { type: 'image/webp' });
                resolve(file);
              } else {
                reject(new Error("Failed to compress image"));
              }
            }, 'image/webp', 0.03);
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(imageFile);
        });
      })
    );
  };

  const getSignedUrls = async (
    entityId: number,
    files: File[],
    options: Omit<UploadImageOptions, "entityId">,
  ) => {
    const requests: SignedUrlRequest[] = files.map((file, idx) => ({
      entity_type: options.entity_type,
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
          entity_type,
          entity_id,
          media_format,
          media_order,
          mime_type,
        } = signedUrls[i];

        const headers: Record<string, string> = {
          "x-goog-meta-filename": filename,
          "x-goog-meta-media-table": entity_type,
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
      }),
    );
  };

  const handleImageUpload = async (options: UploadImageOptions) => {
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

      const compressedImages: File[] = await compressImages(imageFiles);
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
