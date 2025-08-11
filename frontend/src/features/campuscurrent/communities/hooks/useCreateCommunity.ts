import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "@/features/campuscurrent/communities/api/communitiesApi";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/features/media/hooks/useMediaUpload";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { EntityType, MediaFormat } from "@/features/media/types/types";
import { CreateCommunityData } from "@/features/campuscurrent/types/types";
import { pollForCommunityImages } from "@/utils/polling";
import { useState } from "react";

export function useCreateCommunity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleMediaUpload, resetMediaState } = useMediaUpload();
  const { setIsUploading } = useMediaUploadContext();
  const [uploadProgress, setUploadProgress] = useState(0);

  const createCommunityMutation = useMutation({
    mutationFn: (data: CreateCommunityData) => campuscurrentAPI.addCommunity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campusCurrent", "communities"] });
    },
    onError: (error) => {
      console.error("Community creation failed:", error);
      toast({
        title: "Error",
        description: "Failed to create community",
        variant: "destructive",
      });
    },
  });

  const handleCreate = async (communityData: CreateCommunityData) => {
    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Create the community first
      const newCommunity = await createCommunityMutation.mutateAsync(communityData);
      setUploadProgress(40);

      // Upload media if any
      await handleMediaUpload({
        entity_type: EntityType.communities,
        entityId: newCommunity.id,
        mediaFormat: MediaFormat.profile,
      });

      setUploadProgress(70);

      // Poll for community images to be processed
      await pollForCommunityImages(
        newCommunity.id,
        queryClient,
        "campusCurrent",
        campuscurrentAPI.getCommunityQueryOptions
      );

      setUploadProgress(100);
      resetMediaState();

      toast({
        title: "Success",
        description: "Community created successfully!",
      });

      return newCommunity;
    } catch (error) {
      console.error("Community creation failed:", error);
      toast({
        title: "Error",
        description: "Failed to create community or upload images",
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
    isCreating: createCommunityMutation.isPending,
    uploadProgress,
  };
}

