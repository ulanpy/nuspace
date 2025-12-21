"use client";

import { useState } from "react";
import { Button } from "../../components/atoms/button";
import { useUser } from "../../hooks/use-user";
import { Modal } from "../../components/atoms/modal";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  message: string;
}

export const LoginModal = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  message,
}: LoginModalProps) => {
  const { login } = useUser();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = () => {
    setIsLoggingIn(true);
    login();
    // In a real app, we would wait for the login to complete
    // For now, we'll just simulate it
    setTimeout(() => {
      setIsLoggingIn(false);
      onSuccess();
    }, 1000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!bg-transparent !shadow-none border-none max-w-xl"
      contentClassName="[&>div.sticky]:hidden"
    >
      <div className="rounded-2xl border border-border/60 bg-background p-4 flex flex-col gap-3">
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
            onClick={handleLogin}
            disabled={isLoggingIn}
            size="sm"
            className="h-9 rounded-full px-4 text-sm font-medium"
          >
            {isLoggingIn ? "Logging in..." : "Login"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
