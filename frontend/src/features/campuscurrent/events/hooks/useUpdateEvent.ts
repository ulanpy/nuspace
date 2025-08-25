import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "@/features/campuscurrent/events/api/eventsApi";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/features/media/hooks/useMediaUpload";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useMediaEditContext } from "@/context/MediaEditContext";

import { EditEventData, Event } from "@/features/campuscurrent/types/types";
import { pollForEventImages } from "@/utils/polling";
import { EntityType, MediaFormat, UploadMediaOptions } from "@/features/media/types/types";
import { mediaApi } from "@/features/media/api/mediaApi";
import { useState } from "react";

export function useUpdateEvent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleMediaUpload, resetMediaState } = useMediaUpload();
  const { setIsUploading, mediaFiles } = useMediaUploadContext();
  const { mediaToDelete, setMediaToDelete, setOriginalMedia } = useMediaEditContext();
  const [uploadProgress, setUploadProgress] = useState(0);

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditEventData }) => 
      campuscurrentAPI.editEvent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campusCurrent", "events"] });
      queryClient.invalidateQueries({ queryKey: ["campusCurrent", "event", variables.id] });
    },
    onError: (error) => {
      console.error("Event update failed:", error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const handleUpdate = async (eventId: string, eventData: EditEventData) => {
    try {
      // First update the event quickly
      const updatedEvent = await updateEventMutation.mutateAsync({
        id: eventId,
        data: eventData,
      });

      // Launch media operations in background (non-blocking)
      if (mediaToDelete.length > 0 || mediaFiles.length > 0) {
        void (async () => {
          try {
            setIsUploading(true);
            setUploadProgress(0);

            // Delete marked media first
            if (mediaToDelete.length > 0) {
              setUploadProgress(10);
              await mediaApi.deleteMedia(mediaToDelete);
              setUploadProgress(15);
            }

            // Upload new media files if any
            if (mediaFiles.length > 0) {
              setUploadProgress(20);
              const uploadOptions: UploadMediaOptions = {
                entity_type: EntityType.community_events,
                entityId: updatedEvent.id,
                mediaFormat: MediaFormat.carousel,
                startOrder: 0,
              };
              await handleMediaUpload(uploadOptions);
              setUploadProgress(60);

              // Poll for uploaded images
              await pollForEventImages(
                updatedEvent.id,
                queryClient,
                "campusCurrent",
                campuscurrentAPI.getEventQueryOptions
              );
            }

            setUploadProgress(100);
          } catch (uploadError) {
            console.warn("Background media update failed:", uploadError);
          } finally {
            // Reset states regardless of outcome
            resetMediaState();
            setMediaToDelete([]);
            setOriginalMedia([]);
            setIsUploading(false);
            setUploadProgress(0);
          }
        })();
      }

      toast({
        title: "Success",
        description: "Event updated successfully",
      });

      return updatedEvent;
    } catch (error) {
      console.error("Event update failed:", error);
      throw error;
    }
  };

  return {
    handleUpdate,
    isUpdating: updateEventMutation.isPending,
    uploadProgress,
  };
}