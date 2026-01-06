import { cn } from "../../utils/utils";

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
        "flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all duration-200",
        "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "group cursor-pointer flex-shrink-0 w-full max-w-[60px] sm:max-w-[70px] md:max-w-[80px]",
        ""
      )}
    >
      {/* Image/Icon Container */}
      <div
        className={cn(
          "relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-md overflow-hidden",
          "border transition-all duration-200",
          "bg-background shadow-sm",
          isSelected 
            ? "border-primary/40 shadow-sm" 
            : "border-border hover:border-border/80 group-hover:shadow-md"
        )}
      >
        {icon ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-xs font-medium">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute -inset-[1px] bg-primary/5 border border-primary/40 rounded-md" />
        )}
      </div>
      
      {/* Label */}
      <span 
        className={cn(
          "text-[10px] sm:text-xs font-medium text-center leading-tight",
          "transition-colors duration-200 px-0.5",
          isSelected 
            ? "text-muted-foreground" 
            : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {title}
      </span>
    </button>
  );
};
