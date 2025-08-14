import { useMutation } from "@tanstack/react-query";
import { subspaceApi } from "@/features/campuscurrent/subspace/api/subspaceApi";
import { queryClient } from "@/utils/query-client";

export function useDeletePost(id: string | number) {
  return useMutation({
    mutationFn: () => subspaceApi.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subspaceApi.baseKey });
    },
  });
}


