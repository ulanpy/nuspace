"use client";

import { Button } from "../../atoms/button";
import { User, LogOut } from "lucide-react";
import { useUser } from "@/hooks/use-user";

export function LoginButton() {
  const { user, login, logout } = useUser();

  return (
    <div className="flex items-center gap-2">
      {user ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="flex items-center gap-1"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline-block">Logout</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={login}
          className="flex items-center gap-1"
        >
          <User className="h-4 w-4" />
          <span>Login</span>
        </Button>
      )}
    </div>
  );
}
