import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { campuscurrentAPI } from '@/features/events/api/events-api';
import { useToast } from "@/hooks/use-toast";

export function useDeleteEvent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

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
      router.replace("/events");
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