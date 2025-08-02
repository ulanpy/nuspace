import { useTheme } from "../../context/ThemeProviderContext";

interface CategoryCardProps {
  title: string;
  icon?: JSX.Element;
  imageUrl?: string; // Optional image path
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
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center cursor-pointer flex-shrink-0 group"
    >
      {/* Image/Icon Tile */}
      <div
        className={`
          flex items-center justify-center
          w-12 h-12 sm:w-14 sm:h-14 mb-1 sm:mb-1.5
          rounded-xl
          border border-border/40
          transition-all duration-200 ease-out
          overflow-hidden
          ${
            imageUrl
              ? isSelected
                ? "shadow-md border-slate-400 scale-[0.96]"
                : "hover:shadow-sm hover:scale-[0.98] group-hover:border-slate-300"
              : isSelected
                ? isDarkTheme
                  ? "bg-slate-900 text-white shadow-md border-slate-700 scale-[0.96]"
                  : "bg-slate-100 text-slate-900 shadow-md border-slate-300 scale-[0.96]"
                : isDarkTheme
                  ? "bg-slate-800/50 text-slate-300 hover:bg-slate-800/80 hover:text-white group-hover:shadow-sm group-hover:scale-[0.98] group-hover:border-slate-600"
                  : "bg-slate-50/80 text-slate-500 hover:bg-slate-100/90 hover:text-slate-900 group-hover:shadow-sm group-hover:scale-[0.98] group-hover:border-slate-300"
          }
        `}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-all duration-200"
          />
        ) : icon ? (
          <span className="text-lg sm:text-xl transition-all duration-200">{icon}</span>
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">{title.charAt(0)}</span>
          </div>
        )}
      </div>
      
      {/* Text Below Tile */}
      <span 
        className={`
          text-xs font-medium text-center max-w-[60px] sm:max-w-[70px] leading-tight
          transition-all duration-200
          ${
            isSelected
              ? isDarkTheme
                ? "text-white"
                : "text-slate-900"
              : isDarkTheme
                ? "text-slate-400 group-hover:text-slate-300"
                : "text-slate-600 group-hover:text-slate-800"
          }
        `}
      >
        {title}
      </span>
    </div>
  );
};
