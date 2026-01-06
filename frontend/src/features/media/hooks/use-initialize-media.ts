//useInitializeMedia.ts

import { useEffect } from "react";
import { useMediaUploadContext } from '@/context/media-upload-context';
import { useMediaEditContext } from '@/context/media-edit-context';
import type { Media } from "@/features/media/types/types";

/**
 * Initializes media-related state for edit/create flows.
 * Centralizes the useEffect logic used in modals.
 */
export function useInitializeMedia({
  isEditMode,
  mediaItems,
  deps = [],
}: {
  isEditMode: boolean;
  mediaItems?: Media[] | null;
  deps?: any[];
}) {
  const { setPreviewMedia, setMediaFiles } = useMediaUploadContext();
  const { setOriginalMedia, setMediaToDelete, setCurrentMediaIndex } =
    useMediaEditContext();

  useEffect(() => {
    if (isEditMode && mediaItems && mediaItems.length) {
      // Existing media previews
      setPreviewMedia(mediaItems.map((m) => m.url));

      // Track original media for edits (keep order as string to match existing usage)
      setOriginalMedia(
        mediaItems.map((m) => ({
          id: m.id,
          url: m.url,
          order: String(m.media_order),
          media_format: m.media_format,
        })) as any
      );

      // Reset upload/edit helpers
      setMediaFiles([]);
      setMediaToDelete([]);
      setCurrentMediaIndex(0);
    } else if (!isEditMode) {
      // Full reset in create mode
      setPreviewMedia([]);
      setMediaFiles([]);
      setOriginalMedia([] as any);
      setMediaToDelete([]);
      setCurrentMediaIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEditMode,
    mediaItems,
    setPreviewMedia,
    setMediaFiles,
    setOriginalMedia,
    setMediaToDelete,
    setCurrentMediaIndex,
    ...deps,
  ]);
}


