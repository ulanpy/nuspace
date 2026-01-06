import { UploadMediaOptions } from "../types/types";
import { SignedUrlRequest, SignedUrlResponse } from "../types/types";
import { mediaApi } from '../api/media-api';

export const getSignedUrls = async (
    entityId: number,
    files: File[],
    options: Omit<UploadMediaOptions, "entityId">,
  ): Promise<SignedUrlResponse[]> => {
    const requests: SignedUrlRequest[] = files.map((file, idx) => ({
      entity_type: options.entity_type,
      entity_id: entityId,
      media_format: options.mediaFormat,
      media_order: (options.startOrder || 0) + idx,
      mime_type: file.type,
      content_type: file.type,
    }));

    return await mediaApi.getSignedUrls(requests);
  };