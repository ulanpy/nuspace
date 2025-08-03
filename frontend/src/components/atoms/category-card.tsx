import { cn } from "../../utils/utils";

interface CategoryCardProps {
  title: string;
  icon?: JSX.Element;
  imageUrl: string;
  isSelected: boolean;
  onClick: () => void;
}

export const CategoryCard = ({
  title,
  icon,
  imageUrl,
  isSelected,
  onClick,
}: CategoryCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all duration-200",
        "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "group cursor-pointer flex-shrink-0 w-full max-w-[80px]",
        isSelected && "bg-accent"
      )}
    >
      {/* Image/Icon Container */}
      <div
        className={cn(
          "relative w-14 h-14 sm:w-16 sm:h-16 rounded-md overflow-hidden",
          "border transition-all duration-200",
          "bg-background shadow-sm",
          isSelected 
            ? "border-primary shadow-md" 
            : "border-border hover:border-border/80 group-hover:shadow-md"
        )}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover object-center"
            style={{ minWidth: '100%', minHeight: '100%' }}
          />
        ) : icon ? (
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
          <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-lg" />
        )}
      </div>
      
      {/* Label */}
      <span 
        className={cn(
          "text-[10px] sm:text-xs font-medium text-center leading-tight",
          "transition-colors duration-200 px-0.5",
          isSelected 
            ? "text-primary" 
            : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {title}
      </span>
    </button>
  );
};
