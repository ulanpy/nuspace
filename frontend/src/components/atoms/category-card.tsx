import { useTheme } from "../../context/theme-provider";

interface CategoryCardProps {
  title: string;
  icon: JSX.Element;
  isSelected: boolean;
  onClick: () => void;
}

export const CategoryCard = ({
  title,
  icon,
  isSelected,
  onClick,
}: CategoryCardProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  return (
    <div
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center flex-shrink-0
        w-[clamp(90px,14vw,115px)] py-3
        rounded-xl text-sm cursor-pointer
        border border-border/40
        transition duration-300 ease-in-out
        ${
          isSelected
            ? isDarkTheme
              ? "bg-slate-900 text-white scale-105 shadow-lg border-slate-700"
              : "bg-slate-100 text-slate-900 scale-105 shadow-lg border-slate-200"
            : isDarkTheme
            ? "bg-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-300 hover:scale-105"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 hover:scale-105"
        }
      `}
    >
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-2xs font-bold tracking-wide">{title}</div>
    </div>
  );
};
