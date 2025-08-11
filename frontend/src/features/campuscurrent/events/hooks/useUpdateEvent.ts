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
    mutationFn: ({ id, data }: { id: string; data: Event }) => 
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
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // First, delete any media that was marked for deletion
      if (mediaToDelete.length > 0) {
        setUploadProgress(10);
        await mediaApi.deleteMedia(mediaToDelete);
        setUploadProgress(15);
      }

      // Create the updated event first
      const updatedEvent = await updateEventMutation.mutateAsync({
        id: eventId,
        data: {
          ...eventData,
          id: parseInt(eventId),
          community_id: 1, // Will be filled by backend
          creator_sub: "", // Will be filled by backend
          scope: "personal", // Will be filled by backend
          created_at: "",
          updated_at: "",
          media: [],
        } as Event
      });

      // Handle media upload if there are new media files
      if (mediaFiles.length > 0) {
        setUploadProgress(20);
        
        const uploadOptions: UploadMediaOptions = {
          entity_type: EntityType.community_events,
          entityId: updatedEvent.id,
          mediaFormat: MediaFormat.carousel,
          startOrder: 0
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
        setUploadProgress(100);
      }

      setUploadProgress(100);
      
      // Reset states
      resetMediaState();
      setMediaToDelete([]);
      setOriginalMedia([]);
      
      toast({
        title: "Success",
        description: "Event updated successfully",
      });

      return updatedEvent;
    } catch (error) {
      console.error("Event update failed:", error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    handleUpdate,
    isUpdating: updateEventMutation.isPending,
    uploadProgress,
  };
}