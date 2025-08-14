import { useMutation } from "@tanstack/react-query";
import { subspaceApi } from "@/features/campuscurrent/subspace/api/subspaceApi";
import type { CreatePostData } from "@/features/campuscurrent/subspace/types";
import { queryClient } from "@/utils/query-client";

export function useCreatePost() {
  return useMutation({
    mutationFn: (data: CreatePostData) => subspaceApi.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subspaceApi.baseKey });
    },
  });
}


