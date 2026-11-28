import { useState } from "react"

import { SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

const PLACEHOLDER = {
  bar: "Search",
  hero: "",
} as const

/**
 * Google's field, in the app's tokens: 44px, a full pill, the magnifier *inside*
 * the left edge, and a real input you can type in.
 *
 * The pill is a `ButtonGroup` — the field and the action that goes with it are
 * one control, and the group is what joins them without a second border. The
 * field itself is an `InputGroup`, so the magnifier and the clear button are
 * the addons they are meant to be rather than hand-rolled siblings.
 *
 * On the front door the blue button *is* inside the pill, because there is
 * nothing else on that row. On the results bar the launcher and Sign in sit
 * outside the pill, so the field keeps the whole right edge for the clear
 * button.
 *
 * Google has no focus ring on it, so the pill's border is what says the field
 * has focus. The ring the `InputGroup` puts on by default is turned off.
 */
export function SearchField({
  defaultValue = "",
  size = "bar",
  placeholder,
  className,
  action = "?c=nuspace-results",
  onValueChange,
}: {
  defaultValue?: string
  size?: "bar" | "hero"
  placeholder?: string
  className?: string
  /** Where the form goes. A workbench entry, not a route. */
  action?: string
  onValueChange?: (value: string) => void
}) {
  const [value, setValue] = useState(defaultValue)

  /**
   * A GET form throws the action's own query string away and replaces it with
   * the field's, so whatever the destination carries has to ride along as a
   * hidden field. Without it, submitting lands on the token sheet.
   */
  const [path, search = ""] = action.split("?")
  const carried = new URLSearchParams(search)

  return (
    <form
      action={`${path}?${carried}`}
      method="get"
      className={cn("w-full", className)}
    >
      {[...carried].map(([name, carriedValue]) => (
        <input key={name} type="hidden" name={name} value={carriedValue} />
      ))}

      <ButtonGroup
        className={cn(
          // `overflow-hidden` is what lets the blue button sit *in* the pill —
          // without it the ring carries on past the button's right edge.
          "h-11 w-full gap-0 overflow-hidden rounded-full border border-input bg-background p-0",
          "has-[[data-slot=input-group-control]:focus-visible]:border-ring",
          "[&>[data-slot=input-group]]:min-w-0",
          "[&>[data-slot=input-group]]:flex-1",
          "[&>[data-slot=input-group]]:rounded-none",
          "[&>[data-slot=input-group]]:border-0",
          "[&>[data-slot=input-group]]:bg-transparent",
          "[&>[data-slot=input-group]]:shadow-none"
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
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              onValueChange?.(event.target.value)
            }}
            aria-label="Search Nuspace"
            placeholder={placeholder ?? PLACEHOLDER[size]}
            autoComplete="off"
            className="text-base"
          />
          {size === "bar" && value ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-sm"
                aria-label="Clear search"
                onClick={() => {
                  setValue("")
                  onValueChange?.("")
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
            className="h-full self-stretch shrink-0 rounded-none border-0 px-6"
          >
            Search
          </Button>
        ) : null}
      </ButtonGroup>
    </form>
  )
}

export default function SearchFieldPreview() {
  return (
    <div className="space-y-8 p-6">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Hero — the front door
        </p>
        <SearchField size="hero" className="max-w-xl" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          With a query
        </p>
        <SearchField defaultValue="club ai" className="max-w-2xl" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Empty
        </p>
        <SearchField className="max-w-2xl" />
      </div>
    </div>
  )
}
