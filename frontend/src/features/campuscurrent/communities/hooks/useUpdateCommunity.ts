import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "@/features/campuscurrent/communities/api/communitiesApi";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/features/media/hooks/useMediaUpload";
import { useMediaEditContext } from "@/context/MediaEditContext";
import { EntityType, MediaFormat } from "@/features/media/types/types";
import { EditCommunityData } from "@/features/campuscurrent/types/types";
import { pollForCommunityImages } from "@/utils/polling";
import { useState } from "react";

export function useUpdateCommunity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleMediaUpload, resetMediaState } = useMediaUpload();
  const { mediaToDelete, setMediaToDelete } = useMediaEditContext();
  
  const [uploadProgress, setUploadProgress] = useState(0);

  const updateCommunityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditCommunityData }) =>
      campuscurrentAPI.editCommunity(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ["campusCurrent", "community", id],
      });
      queryClient.invalidateQueries({ queryKey: ["campusCurrent", "communities"] });
    },
    onError: (error) => {
      console.error("Community update failed:", error);
      toast({
        title: "Error",
        description: "Failed to update community",
        variant: "destructive",
      });
    },
  });

  const handleUpdate = async (id: string, communityData: EditCommunityData) => {
    try {
      setUploadProgress(10);

      // Update the community first
      const updatedCommunity = await updateCommunityMutation.mutateAsync({
        id,
        data: communityData,
      });
      setUploadProgress(40);

      // Upload new media if any
      await handleMediaUpload({
        entity_type: EntityType.communities,
        entityId: updatedCommunity.id,
        mediaFormat: MediaFormat.carousel,
      });

      setUploadProgress(70);

      // Poll for community images to be processed
      await pollForCommunityImages(
        updatedCommunity.id,
        queryClient,
        "campusCurrent",
        campuscurrentAPI.getCommunityQueryOptions
      );

      setUploadProgress(100);
      resetMediaState();

      toast({
        title: "Success",
        description: "Community updated successfully!",
      });

      return updatedCommunity;
    } catch (error) {
      console.error("Community update failed:", error);
      toast({
        title: "Error",
        description: "Failed to update community or upload images",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploadProgress(0);
    }
  };

  return {
    handleUpdate,
    isUpdating: updateCommunityMutation.isPending,
    uploadProgress,
  };
}

