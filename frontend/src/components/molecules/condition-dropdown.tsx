import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeProviderContext";
import { ChevronDown, Filter } from "lucide-react";

interface ConditionDropdownProps {
  conditions: string[];
  selectedCondition: string;
  setSelectedCondition: (condition: string) => void;
  disableNavigation?: boolean;
}

export function ConditionDropdown({
  conditions,
  selectedCondition,
  setSelectedCondition,
  disableNavigation,
}: ConditionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClick = (item: string) => {
    if (!disableNavigation) {
      const params = new URLSearchParams(location.search);
      params.delete("page");
      params.set("condition", item);
      navigate(`${location.pathname}?${params.toString()}`);
    }
    setSelectedCondition(item);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayText = selectedCondition === "All Conditions" ? "All" : selectedCondition;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 px-3 py-2.5
          rounded-l-xl border border-r-0 border-border/40
          text-xs sm:text-sm font-medium
          transition-all duration-200
          min-w-[70px] sm:min-w-[90px]
          ${
            isDarkTheme
              ? "bg-slate-800/50 text-slate-300 hover:bg-slate-800/80 hover:text-white"
              : "bg-slate-50/80 text-slate-600 hover:bg-slate-100/90 hover:text-slate-900"
          }
          ${isOpen ? "z-20" : ""}
        `}
      >
        <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="truncate">{displayText}</span>
        <ChevronDown 
          className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`
            absolute top-full left-0 right-0 mt-1
            border border-border/40 rounded-xl shadow-lg z-30
            overflow-hidden backdrop-blur-sm
            min-w-[120px] sm:min-w-[160px]
            ${
              isDarkTheme
                ? "bg-slate-900/95 border-slate-700"
                : "bg-white/95 border-slate-200"
            }
          `}
        >
          {conditions.map((item, index) => (
            <button
              key={item}
              onClick={() => handleClick(item)}
              className={`
                w-full text-left px-3 py-2
                text-xs sm:text-sm
                transition-colors duration-150
                ${index !== conditions.length - 1 ? "border-b border-border/20" : ""}
                ${
                  selectedCondition === item
                    ? isDarkTheme
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-900"
                    : isDarkTheme
                      ? "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}