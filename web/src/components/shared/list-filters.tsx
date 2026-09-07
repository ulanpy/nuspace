import { SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface FilterOption<T extends string> {
  value: T
  label: string
}

export function SearchFilter({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative min-w-56 flex-1">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        aria-label={placeholder}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder={placeholder}
        className="pl-9"
        autoComplete="off"
      />
    </div>
  )
}

export function ChoiceChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value?: T
  options: readonly FilterOption<T>[]
  onChange: (value: T | undefined) => void
}) {
  return (
    <fieldset className="flex flex-wrap gap-1">
      <legend className="sr-only">{label}</legend>
      <button
        type="button"
        aria-pressed={value === undefined}
        onClick={() => {
          onChange(undefined)
        }}
        className={chipClass(value === undefined)}
      >
        All
      </button>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => {
            onChange(option.value)
          }}
          className={chipClass(value === option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  )
}

function chipClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-sm transition-colors",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    active
      ? "border-primary bg-primary/10 font-medium"
      : "text-muted-foreground hover:bg-muted/60"
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
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    onChange(
                      checked
                        ? selected.filter((item) => item !== option.value)
                        : [...selected, option.value]
                    )
                  }}
                  className="mt-0.5"
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
