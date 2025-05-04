import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "./theme-provider";

export function ConditionGroup({
  conditions,
  selectedCondition,
  setSelectedCondition,
}: {
  conditions: string[];
  selectedCondition: string;
  setSelectedCondition: (condition: string) => void;
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  const handleClick = (item: string) => {
    const params = new URLSearchParams(location.search)
    params.delete('page')
    params.set('condition', item)
    setSelectedCondition(item)
    navigate(`${location.pathname}?${params.toString()}`)
  }
  return (
    <div className="flex space-x-3 overflow-x-auto no-scrollbar">
      {conditions.map((item) => (
        <button
          key={item}
          onClick={() => handleClick(item)}
          className={`
            px-4 py-2 rounded-full
            text-xs font-medium transition
            bg-gradient-to-b from-background/80 to-background/40
            border border-border/40
            backdrop-blur-lg mb-2
            ${
              selectedCondition === item
                ? isDarkTheme
                  ? "bg-slate-800 text-white shadow-md border-slate-700"
                  : "bg-slate-100 text-slate-900 shadow-md border-slate-200"
                : isDarkTheme
                ? "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                : "text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
            }
          `}

        >
          {item}
        </button>
      ))}
    </div>
  );
}
