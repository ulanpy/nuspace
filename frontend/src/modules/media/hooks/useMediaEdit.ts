import { useMediaEditContext } from "@/context/MediaEditContext";

export const useMediaEdit = () => {
  const {
    mediaToDelete,
    originalMedia,
    reorderedMedia,
    currentMediaIndex,
    setMediaToDelete,
    setReorderedMedia,
    setCurrentMediaIndex,
  } = useMediaEditContext();

  const deleteExistingMedia = (mediaId: number) => {
    setMediaToDelete([...mediaToDelete, mediaId]);

    const newReorderedMedia =
      reorderedMedia.length > 0
        ? reorderedMedia.filter((m) => m.id !== mediaId)
        : originalMedia.filter((m) => m.id !== mediaId);
    setReorderedMedia(newReorderedMedia);

    if (
      currentMediaIndex >= newReorderedMedia.length &&
      newReorderedMedia.length > 0
    ) {
      setCurrentMediaIndex(newReorderedMedia.length - 1);
    }
  };

  return {
    deleteExistingMedia,
  };
};
