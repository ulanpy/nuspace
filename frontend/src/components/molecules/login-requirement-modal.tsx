"use client";

import { User, X } from "lucide-react";
import { Button } from "../atoms/button";
import { useUser } from "@/hooks/use-user";

interface LoginRequirementModalProps {
  title?: string;
  description?: string;
  onLogin?: () => void;
  onDismiss?: () => void;
}

export function LoginRequirementModal({
  title = "Login Required",
  description = "You need to be logged in to access this feature.",
  onLogin,
  onDismiss,
}: LoginRequirementModalProps) {
  const { login } = useUser();

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    } else {
      login();
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6 animate-in fade-in-50 zoom-in-95 relative">
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
          <Button className="mt-2 w-full" onClick={handleLogin}>
            Login to Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
