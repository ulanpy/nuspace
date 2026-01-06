import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from '@/features/communities/api/communities-api';
import { useToast } from "@/hooks/use-toast";
import { EditCommunityData } from "@/features/shared/campus/types";
import { useState } from "react";

export function useUpdateCommunity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
      setUploadProgress(100);

      toast({
        title: "Success",
        description: "Community details updated successfully!",
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

