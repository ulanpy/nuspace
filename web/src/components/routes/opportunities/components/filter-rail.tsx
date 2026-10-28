import { useState } from "react"
import { ChevronDownIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"

import type { FilterOption } from "@/components/shared/list-filters"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import {
  EDUCATION_LEVELS,
  EDUCATION_LEVEL_LABELS,
  OPPORTUNITY_MAJORS,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_LABELS,
  activeFilterCount,
  clearFilters,
  toSelection,
  valuesToYears,
  yearsToValues,
} from "@/lib/opportunities"
import type { OpportunitiesSearchState } from "@/lib/opportunities"

const TYPE_OPTIONS = OPPORTUNITY_TYPES.map((value) => ({
  value,
  label: OPPORTUNITY_TYPE_LABELS[value],
}))

const EDUCATION_OPTIONS = EDUCATION_LEVELS.map((value) => ({
  value,
  label: EDUCATION_LEVEL_LABELS[value],
}))

const YEAR_OPTIONS = [1, 2, 3, 4].map((value) => ({
  value: String(value),
  label: `Year ${String(value)}`,
}))

const MAJOR_OPTIONS = OPPORTUNITY_MAJORS.map((value) => ({
  value,
  label: value,
}))

/** Past this many options a multi-select grows a search field. */
const SEARCHABLE_FROM = 12

/**
 * A multi-select as a full-width button that opens its checkboxes in a
 * popover. The popover is the same in the sticky rail and in the sheet, which
 * is what keeps the multi-selects their shape below `xl`.
 */
function RailFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: readonly FilterOption<T>[]
  selected: readonly T[]
  onChange: (next: T[]) => void
}) {
  const [query, setQuery] = useState("")
  const needle = query.trim().toLowerCase()
  const shown = needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options
  const allSelected = selected.length === options.length

  const toggle = (value: T) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{label}</span>
            <span className="flex shrink-0 items-center gap-2">
              {selected.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
                  {selected.length}
                </span>
              )}
              <ChevronDownIcon
                className="size-4 text-muted-foreground"
                aria-hidden
              />
            </span>
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
        <PopoverHeader>
          <div className="flex items-center justify-between gap-2">
            <PopoverTitle>{label}</PopoverTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                onChange(
                  allSelected ? [] : options.map((option) => option.value)
                )
              }}
            >
              {allSelected ? "Clear all" : "Select all"}
            </Button>
          </div>
        </PopoverHeader>

        {options.length > SEARCHABLE_FROM && (
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            placeholder={`Search ${label.toLowerCase()}`}
            aria-label={`Search ${label.toLowerCase()}`}
            className="h-8"
          />
        )}

        <div className="-mx-0.5 max-h-64 overflow-y-auto">
          {shown.map((option) => (
            // The label wraps the checkbox so the whole row is the hit area
            // and the option's text is the checkbox's accessible name.
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => {
                  toggle(option.value)
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
          {shown.length === 0 && (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No {label.toLowerCase()} matches “{query}”.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * The filter rail: four multi-selects, the active/expired toggle and a clear
 * button. It holds no state of its own; the URL does, so the rail renders the
 * same in the sticky column and in the sheet.
 */
export function FilterRail({
  search,
  onSearchChange,
}: {
  search: OpportunitiesSearchState
  onSearchChange: (next: OpportunitiesSearchState) => void
}) {
  const active = activeFilterCount(search)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontalIcon
            className="size-4 text-muted-foreground"
            aria-hidden
          />
          Filters
        </CardTitle>
        <CardAction>
          {active > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="-mr-2 h-7 text-xs"
              onClick={() => {
                onSearchChange(clearFilters(search))
              }}
            >
              <XIcon className="size-3.5" aria-hidden />
              Clear
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <RailFilter
            label="Type"
            options={TYPE_OPTIONS}
            selected={search.type ?? []}
            onChange={(next) => {
              onSearchChange({ ...search, type: toSelection(next) })
            }}
          />
          <RailFilter
            label="Education"
            options={EDUCATION_OPTIONS}
            selected={search.education ?? []}
            onChange={(next) => {
              onSearchChange({ ...search, education: toSelection(next) })
            }}
          />
          <RailFilter
            label="Year"
            options={YEAR_OPTIONS}
            selected={yearsToValues(search.years)}
            onChange={(next) => {
              onSearchChange({ ...search, years: valuesToYears(next) })
            }}
          />
          <RailFilter
            label="Major"
            options={MAJOR_OPTIONS}
            selected={search.majors ?? []}
            onChange={(next) => {
              onSearchChange({ ...search, majors: toSelection(next) })
            }}
          />
        </div>

        <Separator className="my-4" />

        <Toggle
          variant="outline"
          pressed={search.hideExpired}
          onPressedChange={(hideExpired) => {
            onSearchChange({ ...search, hideExpired })
          }}
          className="w-full justify-start"
        >
          {search.hideExpired
            ? "Active opportunities only"
            : "Including expired"}
        </Toggle>

        <p className="mt-3 text-xs/relaxed text-muted-foreground">
          Majors are a guide, not a strict requirement. Always check the
          official programme page.
        </p>
      </CardContent>
    </Card>
  )
}
