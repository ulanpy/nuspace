import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from '@/features/events/api/events-api';
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from '@/features/media/hooks/use-media-upload';
import { useMediaUploadContext } from '@/context/media-upload-context';
import { EntityType, MediaFormat } from "@/features/media/types/types";
import { CreateEventData } from "@/features/shared/campus/types";
import { pollForEventImages } from "@/utils/polling";
import { useState } from "react";



export function useCreateEvent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleMediaUpload, resetMediaState } = useMediaUpload();
  const { setIsUploading, mediaFiles } = useMediaUploadContext();
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
      // Create the event first
      const newEvent = await createEventMutation.mutateAsync(eventData);

      // Fire-and-forget media upload and polling in background (non-blocking)
      if (mediaFiles.length > 0) {
        void (async () => {
          try {
            setIsUploading(true);
            setUploadProgress(10);
            await handleMediaUpload({
              entity_type: EntityType.community_events,
              entityId: newEvent.id,
              mediaFormat: MediaFormat.carousel,
            });

            setUploadProgress(70);

            await pollForEventImages(
              newEvent.id,
              queryClient,
              "campusCurrent",
              campuscurrentAPI.getEventQueryOptions
            );

            setUploadProgress(100);
            resetMediaState();
          } catch (uploadError) {
            console.warn("Background media upload failed:", uploadError);
          } finally {
            setIsUploading(false);
            setUploadProgress(0);
          }
        })();
      }

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
      // no-op; background task manages uploading state
    }
  };

  return {
    handleCreate,
    isCreating: createEventMutation.isPending,
    uploadProgress,
  };
}