import type { ComponentType } from "react"

import { PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface FacetOption {
  label: string
  value: string
  icon?: ComponentType<{ className?: string }>
}

export interface DataTableFacetedFilterProps {
  title: string
  options: FacetOption[]
  selectedValues: string[]
  onSelectionChange: (values: string[] | undefined) => void
  triggerClassName?: string
}

/**
 * A multi-choice filter, as a popover off a dashed button.
 *
 * The single-choice filter is a row of tabs, which is right while there are
 * three of them. Past that a tab strip runs out of room, so the filter folds
 * into a button that carries what is selected: the count on a narrow screen,
 * the names of the selected options on a wide one.
 */
export function DataTableFacetedFilter({
  title,
  options,
  selectedValues,
  onSelectionChange,
  triggerClassName,
}: DataTableFacetedFilterProps) {
  const selected = new Set(selectedValues)

  const toggle = (value: string) => {
    const next = new Set(selectedValues)
    if (next.has(value)) {
      next.delete(value)
    } else {
      next.add(value)
    }
    onSelectionChange(next.size ? [...next] : undefined)
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 border-dashed", triggerClassName)}
          >
            <PlusIcon className="mr-2 size-4" aria-hidden />
            {title}
            {selected.size > 0 ? (
              <>
                <span className="mx-2 h-4 w-px bg-border" aria-hidden />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal lg:hidden"
                >
                  {selected.size}
                </Badge>
                <div className="hidden space-x-1 lg:flex">
                  {selected.size > 2 ? (
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {selected.size} selected
                    </Badge>
                  ) : (
                    options
                      .filter((option) => selected.has(option.value))
                      .map((option) => (
                        <Badge
                          variant="secondary"
                          key={option.value}
                          className="rounded-sm px-1 font-normal"
                        >
                          {option.label}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            ) : null}
          </Button>
        }
      />

      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    toggle(option.value)
                  }}
                >
                  <Checkbox
                    checked={selected.has(option.value)}
                    className="pointer-events-none"
                  />
                  {option.icon ? (
                    <option.icon className="size-4 text-muted-foreground" />
                  ) : null}
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            {selected.size > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onSelectionChange(undefined)
                    }}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}

            <CommandEmpty>No matches</CommandEmpty>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
