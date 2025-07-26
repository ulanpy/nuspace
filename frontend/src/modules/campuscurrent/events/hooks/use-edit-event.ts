import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "../api/events-api";
import { useParams } from "react-router-dom";

export const useEditCommunity = () => {
  const { id } = useParams<{ id: string }>();
  console.log('id', id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: club) =>
      campuscurrentAPI.editCommunity(data.id, data), 
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: campuscurrentAPI.getEventQueryOptions(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ['nuEvents', 'community', id] });
    },
  });
};