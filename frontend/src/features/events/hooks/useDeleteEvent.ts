import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { campuscurrentAPI } from "@/features/events/api/eventsApi";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/data/routes";

export function useDeleteEvent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => campuscurrentAPI.deleteEvent(eventId),
    onSuccess: (data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["campusCurrent", "events"] });
      queryClient.removeQueries({ queryKey: ["campusCurrent", "event", eventId] });
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });

      // Redirect to events list page after successful deletion
      navigate(ROUTES.EVENTS.ROOT, { replace: true });
    },
    onError: (error) => {
      console.error("Event deletion failed:", error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (eventId: string) => {
    try {
      await deleteEventMutation.mutateAsync(eventId);
    } catch (error) {
      console.error("Event deletion failed:", error);
      throw error;
    }
  };

  return {
    handleDelete,
    isDeleting: deleteEventMutation.isPending,
  };
}