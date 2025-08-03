import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "../../api/eventsApi";
import { useParams } from "react-router-dom";

export const useEditCommunity = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: club) =>
      campuscurrentAPI.editCommunity(data.id, data), 
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: campuscurrentAPI.getEventQueryOptions(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ['campusCurrent', 'community', id] });
    },
  });
};