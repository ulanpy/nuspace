import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from "../../api/communitiesApi";
import { useParams } from "react-router-dom";

export const useCommunity = () => {
  const { id } = useParams<{ id: string }>();
  const {
    data: club,
    isPending,
    isLoading,
    isError,
  } = useQuery({
    ...campuscurrentAPI.getCommunityQueryOptions(id || ""),
    enabled: !!id,
  });
  return { club: club || null, isPending, isLoading, isError };
};
