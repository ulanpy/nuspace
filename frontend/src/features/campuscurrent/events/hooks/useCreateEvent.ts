import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "@/features/campuscurrent/events/api/eventsApi";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/features/media/hooks/useMediaUpload";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { EntityType, MediaFormat } from "@/features/media/types/types";
import { CreateEventData } from "@/features/campuscurrent/types/types";
import { pollForEventImages } from "@/utils/polling";
import { useState } from "react";



export function useCreateEvent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleMediaUpload, resetMediaState } = useMediaUpload();
  const { setIsUploading } = useMediaUploadContext();
  const [uploadProgress, setUploadProgress] = useState(0);

  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventData) => campuscurrentAPI.addEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campusCurrent", "events"] });
    },
    onError: (error) => {
      console.error("Event creation failed:", error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const handleCreate = async (eventData: CreateEventData) => {
    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Create the event first
      const newEvent = await createEventMutation.mutateAsync(eventData);
      setUploadProgress(40);

      // Upload media if any
      await handleMediaUpload({
        entity_type: EntityType.community_events,
        entityId: newEvent.id,
        mediaFormat: MediaFormat.carousel,
      });

      setUploadProgress(70);

      // Poll for event images to be processed
      await pollForEventImages(
        newEvent.id,
        queryClient,
        "campusCurrent",
        campuscurrentAPI.getEventQueryOptions
      );

      setUploadProgress(100);
      resetMediaState();

      toast({
        title: "Success",
        description: "Event created successfully!",
      });

      return newEvent;
    } catch (error) {
      console.error("Event creation failed:", error);
      toast({
        title: "Error",
        description: "Failed to create event or upload images",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    handleCreate,
    isCreating: createEventMutation.isPending,
    uploadProgress,
  };
}