import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "../../api/eventsApi";

export const useAddEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CampusCurrent.Event) =>
      campuscurrentAPI.addEvent(data), 
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: campuscurrentAPI.getEventQueryOptions(variables.id.toString()),
      });
      queryClient.invalidateQueries({ queryKey: ['campusCurrent', 'event'] });
    },
  });
};