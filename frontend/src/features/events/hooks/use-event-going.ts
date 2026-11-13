import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "@/features/events/api/events-api";
import { toast } from "@/hooks/toast";
import type { Event, EventGoingResponse } from "@/features/shared/campus/types";

export function useEventGoing(eventId: number | undefined) {
  const queryClient = useQueryClient();
  const id = eventId != null ? String(eventId) : "";

  const applyGoingState = (data: EventGoingResponse) => {
    queryClient.setQueryData<Event>(
      ["campusCurrent", "event", id],
      (current) =>
        current
          ? {
              ...current,
              attendees_count: data.attendees_count,
              is_going: data.is_going,
            }
          : current,
    );
    queryClient.invalidateQueries({ queryKey: ["campusCurrent", "events"] });
    queryClient.invalidateQueries({
      queryKey: ["campusCurrent", "event", id, "attendees"],
    });
  };

  const setGoingMutation = useMutation({
    mutationFn: () => campuscurrentAPI.setGoing(id),
    onSuccess: applyGoingState,
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark yourself as going",
        variant: "destructive",
      });
    },
  });

  const unsetGoingMutation = useMutation({
    mutationFn: () => campuscurrentAPI.unsetGoing(id),
    onSuccess: applyGoingState,
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update going status",
        variant: "destructive",
      });
    },
  });

  const answerGoing = async (going: boolean, currentlyGoing: boolean) => {
    if (!id || going === currentlyGoing) return;
    if (going) {
      await setGoingMutation.mutateAsync();
    } else {
      await unsetGoingMutation.mutateAsync();
    }
  };

  return {
    answerGoing,
    isToggling: setGoingMutation.isPending || unsetGoingMutation.isPending,
  };
}
