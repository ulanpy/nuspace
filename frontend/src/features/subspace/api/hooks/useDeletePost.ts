import { useMutation } from "@tanstack/react-query";
import { subspaceApi } from "@/features/subspace/api/subspaceApi";
import { queryClient } from "@/utils/query-client";

export function useDeletePost() {
  return useMutation({
    mutationFn: (id: string | number) => subspaceApi.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subspaceApi.baseKey });
    },
  });
}