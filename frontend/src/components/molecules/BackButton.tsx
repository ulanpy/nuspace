"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "@/utils/utils";
import { useBackNavigation } from "@/context/BackNavigationContext";

interface BackButtonProps {
  className?: string;
  label?: string;
}

export function BackButton({ className, label = "Back" }: BackButtonProps) {
  const { triggerBack } = useBackNavigation();

  return (
    <button
      type="button"
      onClick={triggerBack}
      className={cn(
        "flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors",
        className,
      )}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline text-sm">{label}</span>
    </button>
  );
}


