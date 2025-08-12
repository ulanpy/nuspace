"use client";

import { BadgeCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/atoms/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/atoms/popover";
import { useState } from "react";

interface VerificationBadgeProps {
  className?: string;
  size?: number;
  label?: string;
}

export function VerificationBadge({ className, size = 14, label = "Verified" }: VerificationBadgeProps) {
  const [open, setOpen] = useState(false);

  // We use tooltip for hover/focus, and popover for click (mobile-friendly)
  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={
                  "inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary p-0.5 focus:outline-none " +
                  (className ?? "")
                }
                aria-label="Verified community"
              >
                <BadgeCheck className="text-primary" width={size} height={size} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">This is a verified community</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-fit px-3 py-2 text-xs" sideOffset={6}>
          This is a verified community
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}


