import { useMutation } from "@tanstack/react-query";
import { subspaceApi } from "@/features/subspace/api/subspaceApi";
import type { UpdatePostData } from "@/features/subspace/types";
import { queryClient } from "@/utils/query-client";

export function useUpdatePost() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdatePostData }) => subspaceApi.updatePost(id, data),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: subspaceApi.baseKey });
      queryClient.invalidateQueries({ 
        queryKey: [...subspaceApi.baseKey, "detail", String(id)] });
    },
  });
}