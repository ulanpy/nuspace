import { apiCall } from "@/utils/api";
import { SignedUrlRequest, SignedUrlResponse } from "../types/types";


export const mediaApi = {
  baseKey: "media",

  getSignedUrls: async (
    requests: SignedUrlRequest[],
  ): Promise<SignedUrlResponse[]> => {
    return apiCall<SignedUrlResponse[]>(`/bucket/upload-url`, {
      method: "POST",
      json: requests,
    });
  },

  uploadImage: async (
    file: File,
    filename: string,
    entityId: number,
    mediaOrder: number,
    entityType: string,
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("filename", filename);
    formData.append("mime_type", file.type);
    formData.append("entity_type", entityType);
    formData.append("entity_id", entityId.toString());
    formData.append("media_format", "carousel");
    formData.append("media_order", mediaOrder.toString());

    const response = await apiCall(`/bucket/upload-image/`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    return response as string;
  },

  deleteMedia: async (mediaIds: number[]) => {
    if (!mediaIds.length) return true;

    try {
      const deletePromises = mediaIds.map((mediaId) => {
        return apiCall(`/bucket?media_id=${mediaId}`, {
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
  },

};
