import { SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface FilterOption<T extends string> {
  value: T
  label: string
}

export function SearchFilter({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Accessible name. Defaults to the placeholder, which is rarely the right
   * label when the placeholder is a content hint like "Security, counseling…".
   */
  label?: string
}) {
  return (
    <InputGroup className="min-w-56 flex-1">
      <InputGroupAddon>
        <SearchIcon aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        aria-label={label ?? placeholder}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
    </InputGroup>
  )
}

/** Base UI's `Tabs` wants a value on every Tab, so "no filter" gets one. */
const ALL = "__all__"

/**
 * A single-choice filter: one tab lit, everything else not.
 *
 * The same `ui/tabs` primitives as `RouteTabs` with no panels behind them —
 * these single out one value in the URL rather than navigating to a route, and
 * the tab strip is what every page already used for that. `undefined` means "no
 * filter", which the `All` chip carries.
 */
export function FilterTabs<T extends string>({
  label,
  value,
  options,
  showAll = true,
  onChange,
}: {
  label: string
  value: T | undefined
  options: readonly FilterOption<T>[]
  /** Off for a filter that always has a value, e.g. the events time range. */
  showAll?: boolean
  onChange: (value: T | undefined) => void
}) {
  return (
    <Tabs
      className="w-fit max-w-full overflow-x-auto"
      value={value ?? ALL}
      onValueChange={(next: string) => {
        // "All" matches no option, which is exactly the "no filter" it means.
        onChange(options.find((option) => option.value === next)?.value)
      }}
    >
      <TabsList aria-label={label}>
        {showAll && <TabsTrigger value={ALL}>All</TabsTrigger>}
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export function MultiFilter<T extends string>({
  label,
  selected,
  options,
  onChange,
}: {
  label: string
  selected: readonly T[]
  options: readonly FilterOption<T>[]
  onChange: (value: T[]) => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            {label}
            {selected.length > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {selected.length}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent
        className="max-h-80 w-72 overflow-y-auto p-2"
        align="start"
      >
        <div className="space-y-1">
          {options.map((option) => {
            const checked = selected.includes(option.value)
            return (
              // The native <label> wraps the checkbox, which Base UI's span
              // control relies on for both its accessible name and its
              // click-anywhere hit area.
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => {
                    onChange(
                      checked
                        ? selected.filter((item) => item !== option.value)
                        : [...selected, option.value]
                    )
                  }}
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => {
              onChange([])
            }}
          >
            <XIcon aria-hidden />
            Clear {label.toLowerCase()}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
