"use client";

import { Button } from "../atoms/button";
import { useUser } from "../../hooks/use-user";
import { Modal } from "../atoms/modal";

interface AuthWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export const AuthWallModal = ({
  isOpen,
  onClose,
  title = "Login Required",
  message,
}: AuthWallModalProps) => {
  const { login } = useUser();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!bg-transparent !shadow-none border-none max-w-xl"
      contentClassName="[&>div.sticky]:hidden"
    >
      <div className="rounded-lg border border-border/60 bg-background p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <p className="text-lg font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 -mt-1 -mr-1"
          >
            <span className="text-muted-foreground text-lg">✕</span>
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-9 px-4 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={login}
            size="sm"
            className="h-9 rounded-full px-4 text-sm font-medium"
          >
            Login
          </Button>
        </div>
      </div>
    </Modal>
  );
};
