import { useTheme } from "../../context/ThemeProviderContext";

interface CategoryCardProps {
  title: string;
  icon: JSX.Element;
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
      className="flex flex-col items-center cursor-pointer flex-shrink-0"
    >
      {/* Image/Icon Tile */}
      <div
        className={`
          flex items-center justify-center
          w-16 h-16 mb-2
          rounded-xl
          border border-border/40
          transition duration-300 ease-in-out
          overflow-hidden
          ${
            imageUrl
              ? isSelected
                ? "scale-105 shadow-lg border-slate-400"
                : "hover:scale-105 border-border/40"
              : isSelected
                ? isDarkTheme
                  ? "bg-slate-900 text-white scale-105 shadow-lg border-slate-700"
                  : "bg-slate-100 text-slate-900 scale-105 shadow-lg border-slate-200"
                : isDarkTheme
                  ? "bg-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-300 hover:scale-105"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 hover:scale-105"
          }
        `}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-all duration-300"
          />
        ) : (
          <span className="text-xl">{icon}</span>
        )}
      </div>
      
      {/* Text Below Tile */}
      <span 
        className={`
          text-xs font-medium tracking-wide text-center max-w-[80px]
          transition duration-300 ease-in-out
          ${
            isSelected
              ? isDarkTheme
                ? "text-white"
                : "text-slate-900"
              : isDarkTheme
                ? "text-slate-400"
                : "text-slate-600"
          }
        `}
      >
        {title}
      </span>
    </div>
  );
};
