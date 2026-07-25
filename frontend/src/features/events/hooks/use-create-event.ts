import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campuscurrentAPI } from "@/features/events/api/events-api";
import { toast } from "@/hooks/toast";
import { CreateEventData } from "@/features/shared/campus/types";

export function useCreateEvent() {
  const queryClient = useQueryClient();

  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventData) => campuscurrentAPI.addEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campusCurrent", "events"] });
    },
    onError: (error) => {
      console.error("Event creation failed:", error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const handleCreate = async (eventData: CreateEventData) => {
    try {
      const newEvent = await createEventMutation.mutateAsync(eventData);

      toast({
        title: "Success",
        description: "Event created successfully!",
      });

      return newEvent;
    } catch (error) {
      console.error("Event creation failed:", error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    handleCreate,
    isCreating: createEventMutation.isPending,
  };
}
