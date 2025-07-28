export const deleteMedia = async (mediaIds: number[]) => {
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