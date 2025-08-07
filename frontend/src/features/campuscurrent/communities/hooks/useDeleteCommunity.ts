import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "@/features/campuscurrent/communities/api/communitiesApi";
import { useToast } from "@/hooks/use-toast";

export function useDeleteCommunity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteCommunityMutation = useMutation({
    mutationFn: (id: string) => campuscurrentAPI.deleteCommunity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campusCurrent", "communities"] });
      toast({
        title: "Success",
        description: "Community deleted successfully!",
      });
    },
    onError: (error) => {
      console.error("Community deletion failed:", error);
      toast({
        title: "Error",
        description: "Failed to delete community",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteCommunityMutation.mutateAsync(id);
    } catch (error) {
      console.error("Community deletion failed:", error);
      throw error;
    }
  };

  return {
    handleDelete,
    isDeleting: deleteCommunityMutation.isPending,
  };
}

