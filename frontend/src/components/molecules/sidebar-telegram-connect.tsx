"use client"

import { FaTelegram } from "react-icons/fa"
import { useUser } from "@/hooks/use-user"
import { BindTelegramButton } from "@/components/molecules/buttons/bind-telegram-button"

interface SidebarTelegramConnectProps {
  collapsed?: boolean
}

export function SidebarTelegramConnect({ collapsed = false }: SidebarTelegramConnectProps) {
  const { user } = useUser()

  if (!user) return null

  if (user.tg_id) {
    if (collapsed) {
      return (
        <div className="flex justify-center py-2" title="Telegram connected">
          <FaTelegram className="h-5 w-5 text-[#0088cc]" />
        </div>
      )
    }
    return null
  }

  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <BindTelegramButton compact iconOnly />
      </div>
    )
  }

  return (
    <div className="mx-2 mb-1">
      <BindTelegramButton compact />
    </div>
  )
}
