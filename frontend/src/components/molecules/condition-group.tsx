import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeProviderContext";
/**
 * ConditionGroup Component
 * 
 * A reusable component that renders a horizontally scrollable group of condition/category filter buttons.
 * Used for filtering items (e.g. communities, products) by their condition or category.
 *
 * @component
 * @param {Object} props
 * @param {string[]} props.conditions - Array of condition/category options to display as buttons
 * @param {string} props.selectedCondition - Currently selected condition/category
 * @param {function} props.setSelectedCondition - Callback function to update selected condition
 *
 * Features:
 * - Responsive horizontal scrolling with hidden scrollbar
 * - URL parameter syncing for condition filter
 * - Theme-aware styling (light/dark mode)
 * - Hover and active states with smooth transitions
 * - Maintains filter state across navigation
 */

export function ConditionGroup({
  conditions,
  selectedCondition,
  setSelectedCondition,
}: {
  conditions: string[];
  selectedCondition: string;
  setSelectedCondition: (condition: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  const handleClick = (item: string) => {
    const params = new URLSearchParams(location.search);
    params.delete("page");
    params.set("condition", item);
    setSelectedCondition(item);
    navigate(`${location.pathname}?${params.toString()}`);
  };
  return (
    <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1">
      {conditions.map((item) => (
        <button
          key={item}
          onClick={() => handleClick(item)}
          className={`
            px-3 py-2 sm:px-4 sm:py-2.5
            rounded-xl
            text-xs sm:text-sm font-medium 
            transition-all duration-200
            border border-border/40
            flex-shrink-0
            ${
              selectedCondition === item
                ? isDarkTheme
                  ? "bg-slate-900 text-white shadow-md border-slate-700 scale-[0.98]"
                  : "bg-slate-100 text-slate-900 shadow-md border-slate-300 scale-[0.98]"
                : isDarkTheme
                  ? "bg-slate-800/50 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-slate-600 hover:shadow-sm"
                  : "bg-slate-50/80 text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 hover:border-slate-300 hover:shadow-sm"
            }
          `}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
