import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "@/features/events/api/events-api";
import { toast } from "@/hooks/toast";
import { EditEventData } from "@/features/shared/campus/types";

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditEventData }) =>
      campuscurrentAPI.editEvent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campusCurrent", "events"] });
      queryClient.invalidateQueries({ queryKey: ["campusCurrent", "event", variables.id] });
    },
    onError: (error) => {
      console.error("Event update failed:", error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const handleUpdate = async (eventId: string, eventData: EditEventData) => {
    try {
      const updatedEvent = await updateEventMutation.mutateAsync({
        id: eventId,
        data: eventData,
      });

      toast({
        title: "Success",
        description: "Event updated successfully",
      });

      return updatedEvent;
    } catch (error) {
      console.error("Event update failed:", error);
      throw error;
    }
  };

  return {
    handleUpdate,
    isUpdating: updateEventMutation.isPending,
  };
}
