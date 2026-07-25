import { cn } from "@/lib/utils";

import type { JSX } from "react";

interface CategoryCardProps {
  title: string;
  icon?: JSX.Element;
  isSelected: boolean;
  onClick: () => void;
}

export const CategoryCard = ({
  title,
  icon,
  isSelected,
  onClick,
}: CategoryCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full max-w-[60px] flex-shrink-0 cursor-pointer flex-col items-center gap-1 rounded-lg p-1.5 transition-all duration-200 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[70px] md:max-w-[80px]",
      )}
    >
      <div
        className={cn(
          "relative h-10 w-10 overflow-hidden rounded-md border bg-background shadow-sm transition-all duration-200 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16",
          isSelected
            ? "border-primary/40 shadow-sm"
            : "border-border hover:border-border/80 group-hover:shadow-md",
        )}
      >
        {icon ? (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {icon}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-xs font-medium text-muted-foreground">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {isSelected && (
          <div className="absolute -inset-[1px] rounded-md border border-primary/40 bg-primary/5" />
        )}
      </div>

      <span
        className={cn(
          "px-0.5 text-center text-[10px] font-medium leading-tight transition-colors duration-200 sm:text-xs",
          isSelected
            ? "text-muted-foreground"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {title}
      </span>
    </button>
  );
};
