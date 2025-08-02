import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPost } from "../../api/postsApi";

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      // Invalidate and refetch posts after successful creation
      queryClient.invalidateQueries({ queryKey: ["campusCurrentPost"] });
    },
  });
}; 