import { MoonIcon, SunIcon } from "lucide-react"

import { useTheme } from "@/components/shared/theme/context"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const next = theme === "light" ? "dark" : "light"

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${next} theme`}
      title={`Theme: ${theme}`}
      onClick={() => {
        setTheme(next)
      }}
    >
      {theme === "light" ? (
        <SunIcon className="size-5" aria-hidden />
      ) : (
        <MoonIcon className="size-5" aria-hidden />
      )}
    </Button>
  )
}
