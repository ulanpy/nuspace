import { useMutation } from "@tanstack/react-query";
import { subspaceApi } from "@/features/campuscurrent/subspace/api/subspaceApi";
import type { UpdatePostData } from "@/features/campuscurrent/subspace/types";
import { queryClient } from "@/utils/query-client";

export function useUpdatePost(id: string | number) {
  return useMutation({
    mutationFn: (data: UpdatePostData) => subspaceApi.updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subspaceApi.baseKey });
      queryClient.invalidateQueries({ queryKey: [...subspaceApi.baseKey, "detail", String(id)] });
    },
  });
}


