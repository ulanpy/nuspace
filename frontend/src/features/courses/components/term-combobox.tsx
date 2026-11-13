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
import { formatAcademicTerm } from "../utils/term-utils";

interface TermComboboxProps {
  terms: string[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function TermCombobox({
  terms,
  values,
  onValuesChange,
  disabled = false,
  className,
}: TermComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedTerms = useMemo(() => new Set(values), [values]);
  const selectedLabel =
    values.length === 0
      ? "All terms"
      : values.length === 1
        ? formatAcademicTerm(values[0])
        : `${values.length} terms`;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return terms;
    return terms.filter((term) =>
      `${term} ${formatAcademicTerm(term)}`.toLowerCase().includes(normalizedQuery),
    );
  }, [terms, query]);

  const toggleTerm = (term: string) => {
    onValuesChange(
      selectedTerms.has(term)
        ? values.filter((selectedTerm) => selectedTerm !== term)
        : [...values, term],
    );
  };

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
      <PopoverContent align="start" className="w-64 p-2">
        <div className="px-1 pb-2">
          <Input
            placeholder="Search terms..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9"
          />
        </div>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
            values.length === 0 && "bg-accent text-accent-foreground",
          )}
          onClick={() => onValuesChange([])}
        >
          <Check className={cn("size-4 shrink-0", values.length === 0 ? "opacity-100" : "opacity-0")} />
          <span>All terms</span>
        </button>
        <ul className="mt-1 max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">
              No terms found.
            </li>
          ) : (
            filteredOptions.map((term) => (
              <li key={term}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    selectedTerms.has(term) && "bg-accent text-accent-foreground",
                  )}
                  onClick={() => toggleTerm(term)}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      selectedTerms.has(term) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{formatAcademicTerm(term)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
