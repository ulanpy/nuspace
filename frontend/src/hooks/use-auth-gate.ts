import { useCallback, useState } from "react";
import { useUser } from "@/hooks/use-user";

export function useAuthGate() {
  const { user, login } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const promptLogin = useCallback(() => setIsModalOpen(true), []);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (user) {
        action();
      } else {
        promptLogin();
      }
    },
    [user, promptLogin],
  );

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return { requireAuth, promptLogin, isModalOpen, closeModal, login };
}
