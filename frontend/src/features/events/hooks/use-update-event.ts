import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from '@/features/events/api/events-api';
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from '@/features/media/hooks/use-media-upload';
import { useMediaUploadContext } from '@/context/media-upload-context';
import { useMediaEditContext } from '@/context/media-edit-context';

import { EditEventData, Event } from "@/features/shared/campus/types";
import { pollForEventImages } from "@/utils/polling";
import { EntityType, MediaFormat, UploadMediaOptions } from "@/features/media/types/types";
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
      const payload: EditEventData = {
        ...eventData,
        ...(mediaToDelete.length > 0
          ? { media_ids_to_delete: mediaToDelete }
          : {}),
      };

      const updatedEvent = await updateEventMutation.mutateAsync({
        id: eventId,
        data: payload,
      });

      // Upload new media in background (delete already handled by PATCH)
      if (mediaFiles.length > 0) {
        void (async () => {
          try {
            setIsUploading(true);
            setUploadProgress(20);

            const uploadOptions: UploadMediaOptions = {
              entity_type: EntityType.community_events,
              entityId: updatedEvent.id,
              mediaFormat: MediaFormat.carousel,
              startOrder: 0,
            };
            await handleMediaUpload(uploadOptions);
            setUploadProgress(60);

            await pollForEventImages(
              updatedEvent.id,
              queryClient,
              "campusCurrent",
              campuscurrentAPI.getEventQueryOptions
            );

            setUploadProgress(100);
          } catch (uploadError) {
            console.warn("Background media update failed:", uploadError);
          } finally {
            resetMediaState();
            setMediaToDelete([]);
            setOriginalMedia([]);
            setIsUploading(false);
            setUploadProgress(0);
          }
        })();
      } else {
        setMediaToDelete([]);
        setOriginalMedia([]);
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
