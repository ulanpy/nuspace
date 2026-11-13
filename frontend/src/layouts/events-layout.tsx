"use client";

import { AuthWallModal } from "@/components/molecules/auth-wall-modal";
import { useEventAccessInviteAccept } from "@/features/events/hooks/use-event-access-invite";

export function EventsLayout({ children }: { children: React.ReactNode }) {
  const { isAcceptingAccess, isAuthModalOpen, closeAuthModal } =
    useEventAccessInviteAccept();

  return (
    <div className="space-y-6 pb-20">
      <div className="w-full">
        {isAcceptingAccess ? (
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
            Accepting access link…
          </div>
        ) : (
          children
        )}
      </div>
      <AuthWallModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        message="Log in to accept this organizer access link."
      />
    </div>
  );
}
