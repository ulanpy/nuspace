import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "../../utils/events-api";

export const useAddEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NuEvents.Event) =>
      campuscurrentAPI.addEvent(data), 
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: campuscurrentAPI.getEventQueryOptions(variables.id.toString()),
      });
      queryClient.invalidateQueries({ queryKey: ['nuEvents', 'event'] });
    },
  });
};