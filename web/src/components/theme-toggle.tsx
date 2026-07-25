import { MoonIcon, SunIcon } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

/**
 * Cycles light → dark → system. "system" is the default, so it stays reachable
 * rather than being a setting the user can only leave.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const next =
    theme === "light" ? "dark" : theme === "dark" ? "system" : "light"

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
      <SunIcon className="size-5 dark:hidden" aria-hidden />
      <MoonIcon className="hidden size-5 dark:block" aria-hidden />
    </Button>
  )
}
