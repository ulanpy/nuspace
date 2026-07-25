"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ALL_TERMS_VALUE = "all";

interface TermComboboxProps {
  terms: string[];
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export function TermCombobox({
  terms,
  value,
  onValueChange,
  disabled = false,
  className,
}: TermComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(
    () => [{ value: ALL_TERMS_VALUE, label: "All terms" }, ...terms.map((term) => ({ value: term, label: term }))],
    [terms],
  );

  const selectedValue = value ?? ALL_TERMS_VALUE;
  const selectedLabel =
    options.find((option) => option.value === selectedValue)?.label ?? "All terms";

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          aria-label="Filter by term"
          disabled={disabled}
          className={cn(
            "h-full shrink-0 gap-1 rounded-none rounded-l-md border-0 px-3 font-normal shadow-none hover:bg-transparent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:ring-offset-0 data-[state=open]:bg-accent/50",
            className,
          )}
        >
          <span className="max-w-[7rem] truncate sm:max-w-[9rem]">{selectedLabel}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-0 p-0">
        <div className="border-b border-border p-2">
          <Input
            placeholder="Search terms..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9"
          />
        </div>
        <ul className="max-h-60 overflow-y-auto p-1">
          {filteredOptions.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">
              No terms found.
            </li>
          ) : (
            filteredOptions.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    selectedValue === option.value && "bg-accent text-accent-foreground",
                  )}
                  onClick={() => {
                    onValueChange(
                      option.value === ALL_TERMS_VALUE ? undefined : option.value,
                    );
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      selectedValue === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
