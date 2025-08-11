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
  const { user, login } = useUser();
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
      title={title}
      description={message}
    >
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={isLoggingIn}>
          Cancel
        </Button>
        <Button onClick={handleLogin} disabled={isLoggingIn}>
          {isLoggingIn ? "Logging in..." : "Login"}
        </Button>
      </div>
    </Modal>
  );
};
