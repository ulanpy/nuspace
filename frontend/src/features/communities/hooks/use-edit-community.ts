import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "../api/communitiesApi";
import { useParams } from "react-router-dom";
import { Community } from "@/features/shared/campus/types";

export const useEditCommunity = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Community) =>
      campuscurrentAPI.editCommunity(data.id.toString(), data), 
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: campuscurrentAPI.getCommunityQueryOptions(variables.id.toString()).queryKey,
      });
      queryClient.invalidateQueries({ queryKey: ['campusCurrent', 'community', id] });
    },
  });
};