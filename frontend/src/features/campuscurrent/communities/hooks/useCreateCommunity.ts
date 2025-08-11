import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "@/features/campuscurrent/communities/api/communitiesApi";
import { useToast } from "@/hooks/use-toast";
import { CreateCommunityData } from "@/features/campuscurrent/types/types";

export function useCreateCommunity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      // Create the community and return immediately
      const newCommunity = await createCommunityMutation.mutateAsync(communityData);

      toast({
        title: "Success",
        description: "Community created successfully!",
      });

      return newCommunity;
    } catch (error) {
      console.error("Community creation failed:", error);
      // Error toast is handled in onError, but keep a fallback here just in case
      toast({
        title: "Error",
        description: "Failed to create community",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    handleCreate,
    isCreating: createCommunityMutation.isPending,
  };
}

