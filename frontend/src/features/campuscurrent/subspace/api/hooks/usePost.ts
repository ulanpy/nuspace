import { useQuery } from "@tanstack/react-query";
import { subspaceApi } from "@/features/campuscurrent/subspace/api/subspaceApi";

export function usePost(id: string | number) {
  const { data, isLoading, isError } = useQuery(
    subspaceApi.getPostQueryOptions(id),
  );

  return {
    post: data ?? null,
    isLoading,
    isError,
  };
}


