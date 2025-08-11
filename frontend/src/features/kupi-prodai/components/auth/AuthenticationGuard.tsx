"use client";
import { useUser } from "@/hooks/use-user";
import { LoginPromptCard } from "./LoginPromptCard";
import { TelegramPromptCard } from "./TelegramPromptCard";

interface AuthenticationGuardProps {
  children: React.ReactNode;
}

export function AuthenticationGuard({ children }: AuthenticationGuardProps) {
  const { user, login } = useUser();
  const isTelegramLinked = user?.tg_id || false;

  // Not logged in - show login prompt
  if (!user) {
    return <LoginPromptCard onLogin={login} />;
  }

  // Logged in but no Telegram - show telegram prompt
  if (!isTelegramLinked) {
    return <TelegramPromptCard />;
  }

  // Fully authenticated - render children
  return <>{children}</>;
}