"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function parseLocalDate(value: string): Date | undefined {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface DatePickerProps {
  id?: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fromDate?: Date;
  toDate?: Date;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  fromDate,
  toDate,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start px-3 text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          defaultMonth={value}
          fromDate={fromDate}
          toDate={toDate}
          disabled={
            fromDate || toDate
              ? (date) =>
                  Boolean(
                    (fromDate && date < fromDate) || (toDate && date > toDate),
                  )
              : undefined
          }
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
