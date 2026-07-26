import { useEffect } from "react"

interface TelegramButton {
  setText?: (text: string) => void
  setParams?: (params: {
    text?: string
    is_active?: boolean
    is_visible?: boolean
  }) => void
  enable?: () => void
  disable?: () => void
  show?: () => void
  hide?: () => void
  showProgress?: () => void
  hideProgress?: () => void
  onClick?: (handler: () => void) => void
  offClick?: (handler: () => void) => void
}

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: {
      MainButton?: TelegramButton
      BottomButton?: TelegramButton
    }
  }
}

/** Mirrors the active legacy community-form integration. */
export function useTelegramMainButton({
  enabled,
  text,
  disabled,
  pending,
  onClick,
}: {
  enabled: boolean
  text: string
  disabled: boolean
  pending: boolean
  onClick: () => void
}) {
  useEffect(() => {
    const telegramWindow = window as TelegramWindow
    const webApp = telegramWindow.Telegram?.WebApp
    const button = webApp?.MainButton ?? webApp?.BottomButton
    if (!button) return undefined

    if (!enabled) {
      button.hide?.()
      button.setParams?.({ is_visible: false })
      return undefined
    }

    button.setText?.(text)
    button.setParams?.({
      text,
      is_active: !disabled,
      is_visible: true,
    })
    if (disabled) button.disable?.()
    else button.enable?.()
    button.show?.()
    if (pending) button.showProgress?.()
    else button.hideProgress?.()

    const handler = () => {
      if (!disabled) onClick()
    }
    button.onClick?.(handler)

    return () => {
      button.offClick?.(handler)
      button.hideProgress?.()
      button.hide?.()
    }
  }, [disabled, enabled, onClick, pending, text])
}
