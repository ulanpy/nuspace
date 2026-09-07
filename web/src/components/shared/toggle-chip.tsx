import { cn } from "@/lib/utils"

interface ToggleChipProps {
  label: string
  isActive: boolean
  onClick: () => void
  disabled?: boolean
  className?: string
}

/**
 * A pill that is either on or off.
 *
 * `aria-pressed` rather than a checkbox: these are filters and multi-selects
 * that apply immediately, not fields waiting on a submit, and a screen reader
 * should hear "pressed" rather than "checked". Used by the degree audit filters
 * and by the opportunity form's level, year and type pickers.
 */
export function ToggleChip({
  label,
  isActive,
  onClick,
  disabled = false,
  className,
}: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isActive
          ? "border-primary bg-primary/10 font-medium"
          : "text-muted-foreground hover:bg-muted/60",
        className
      )}
    >
      {label}
    </button>
  )
}
