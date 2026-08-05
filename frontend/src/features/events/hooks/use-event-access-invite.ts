import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "@/router/navigation";
import { campuscurrentAPI } from "@/features/events/api/events-api";
import { toast } from "@/hooks/toast";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useUser } from "@/hooks/use-user";

export function useEventAccessInviteAccept() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isLoading: isUserLoading } = useUser();
  const { promptLogin, isModalOpen, closeModal } = useAuthGate();
  const [isAccepting, setIsAccepting] = useState(false);
  const handledToken = useRef<string | null>(null);
  const loginPrompted = useRef(false);

  const accessToken = searchParams.get("access");

  useEffect(() => {
    if (!accessToken || isUserLoading) return;
    if (handledToken.current === accessToken) return;

    if (!user) {
      if (!loginPrompted.current) {
        loginPrompted.current = true;
        promptLogin();
      }
      return;
    }

    handledToken.current = accessToken;
    setIsAccepting(true);

    void campuscurrentAPI
      .acceptAccessInvite(accessToken)
      .then(async (result) => {
        await queryClient.invalidateQueries({ queryKey: ["campusCurrent"] });
        toast({
          title: result.action === "transferred" ? "Ownership transferred" : "Access granted",
          description:
            result.action === "transferred"
              ? "You are now the owner of this event."
              : "You can now view the attendee list.",
        });
        // Plain URL: TanStack JSON-encodes string search values as ?"4".
        window.location.replace(`/events?id=${result.event_id}`);
      })
      .catch(() => {
        handledToken.current = null;
        toast({
          title: "Invalid or expired link",
          description: "Ask the event poster to generate a new access link.",
          variant: "destructive",
        });
        window.location.replace("/events");
      })
      .finally(() => setIsAccepting(false));
  }, [accessToken, isUserLoading, promptLogin, queryClient, user]);

  return {
    isAcceptingAccess: Boolean(accessToken) && isAccepting,
    isAuthModalOpen: isModalOpen,
    closeAuthModal: closeModal,
  };
}
