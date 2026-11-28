import type { ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"
import { SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

/**
 * Google's field, in the app's tokens: 44px, a full pill, the magnifier inside
 * the left edge. The pill is a `ButtonGroup` so the field and its button are one
 * control; the field is an `InputGroup` so the magnifier and the clear button
 * are its addons.
 *
 * `hero` (the front door) carries the Search button inside the pill. `bar` (the
 * results header) keeps the right edge for the clear button instead.
 *
 * Submitting goes to the root host's `/?q=`, dropping any kind: a new term
 * starts from every kind. A blank field goes nowhere.
 */
export function SearchField({
  value,
  onValueChange,
  size = "bar",
  className,
  children,
}: {
  value: string
  onValueChange: (value: string) => void
  size?: "bar" | "hero"
  className?: string
  /** More buttons inside the form, below the pill ("I'm Feeling Lucky"). */
  children?: ReactNode
}) {
  const navigate = useNavigate()

  return (
    <form
      className={cn("w-full", className)}
      onSubmit={(event) => {
        event.preventDefault()
        const q = value.trim()
        if (q) void navigate({ to: "/", search: { q } })
      }}
    >
      <ButtonGroup
        className={cn(
          // `overflow-hidden` lets the hero's button sit inside the pill.
          "h-11 w-full gap-0 overflow-hidden rounded-full border border-input bg-background p-0",
          "has-[[data-slot=input-group-control]:focus-visible]:border-ring",
          "*:data-[slot=input-group]:min-w-0 *:data-[slot=input-group]:flex-1",
          "*:data-[slot=input-group]:rounded-none *:data-[slot=input-group]:border-0",
          "*:data-[slot=input-group]:bg-transparent *:data-[slot=input-group]:shadow-none"
        )}
      >
        <InputGroup
          className={cn(
            "h-full rounded-none border-0 bg-transparent pl-4 shadow-none ring-0",
            "has-[[data-slot=input-group-control]:focus-visible]:ring-0!"
          )}
        >
          <InputGroupAddon>
            <SearchIcon aria-hidden className="size-5 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            name="q"
            type="search"
            value={value}
            onChange={(event) => {
              onValueChange(event.target.value)
            }}
            aria-label="Search Nuspace"
            placeholder={size === "bar" ? "Search" : undefined}
            autoComplete="off"
            enterKeyHint="search"
            className="text-base [&::-webkit-search-cancel-button]:hidden"
          />
          {size === "bar" && value ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-sm"
                aria-label="Clear search"
                onClick={() => {
                  onValueChange("")
                }}
              >
                <XIcon aria-hidden />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>

        {size === "hero" ? (
          <Button
            type="submit"
            className="h-full shrink-0 self-stretch rounded-none border-0 px-6"
          >
            Search
          </Button>
        ) : null}
      </ButtonGroup>

      {children}
    </form>
  )
}
