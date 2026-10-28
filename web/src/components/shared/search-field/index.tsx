import { useState } from "react"
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
 * The search field: a 44px pill with the magnifier inside its left edge.
 *
 * `hero` is the front door's, with the Search button inside the pill because
 * nothing else shares its row. `bar` is the header's (`staticData.shell.search`),
 * where the launcher and the account sit outside the pill, so it keeps its
 * right edge for a clear button instead.
 *
 * It is a GET form for `q`, so it works before any script has a say; a screen
 * that would rather navigate in place passes `onSubmit`. The pill's border is
 * what shows focus, so the input group's own ring is off.
 */
export function SearchField({
  defaultValue = "",
  size = "bar",
  placeholder = size === "bar" ? "Search" : "",
  action = "/",
  className,
  onSubmit,
}: {
  defaultValue?: string
  size?: "bar" | "hero"
  placeholder?: string
  /** Where the form goes: the root host's results. */
  action?: string
  className?: string
  /** Called with the trimmed query instead of submitting the form. */
  onSubmit?: (query: string) => void
}) {
  const [value, setValue] = useState(defaultValue)

  return (
    <form
      action={action}
      method="get"
      className={cn("w-full", className)}
      onSubmit={(event) => {
        if (!onSubmit) return
        event.preventDefault()
        onSubmit(value.trim())
      }}
    >
      <ButtonGroup className="h-11 w-full overflow-hidden rounded-full border border-input bg-background has-[[data-slot=input-group-control]:focus-visible]:border-ring">
        <InputGroup className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent pl-4 shadow-none ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0!">
          <InputGroupAddon>
            <SearchIcon aria-hidden className="size-5 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            name="q"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
            }}
            aria-label="Search Nuspace"
            placeholder={placeholder}
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
    </form>
  )
}
