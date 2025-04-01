"use client"

import { useAuth } from "@/context/auth-context"
import { Button } from "./ui/button"
import { User, LogOut } from "lucide-react"
import { BindTelegramButton } from "./bind-telegram-button"

export function LoginButton() {
  const { user, isAuthenticated, login, logout } = useAuth()

  return (
    <div className="flex items-center gap-2">
      {isAuthenticated ? (
        <div className="flex items-center gap-2">
          <span className="text-sm hidden sm:inline-block">{user?.user.given_name}</span>
          <BindTelegramButton />
          <Button variant="ghost" size="sm" onClick={logout} className="flex items-center gap-1">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline-block">Logout</span>
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={login} className="flex items-center gap-1">
          <User className="h-4 w-4" />
          <span>Login</span>
        </Button>
      )}
    </div>
  )
}

