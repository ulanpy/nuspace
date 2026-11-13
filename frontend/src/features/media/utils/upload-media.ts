export const uploadMedia = async (files: File[], signedUrls: any[]) => {
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