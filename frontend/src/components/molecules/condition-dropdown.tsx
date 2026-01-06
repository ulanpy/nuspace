"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from '../../context/theme-provider-context';
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
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClick = (item: string) => {
    if (!disableNavigation) {
      const params = new URLSearchParams(window.location.search);
      params.delete("page");
      params.set("condition", item);
      router.push(`${pathname}?${params.toString()}`);
    }
    setSelectedCondition(item);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDisplayLabel = (value: string) => {
    if (value === "All Conditions") return "All";
    switch (value) {
      case "new":
        return "New";
      case "like_new":
        return "Like New";
      case "used":
        return "Used";
      default:
        return value;
    }
  };

  const displayText = getDisplayLabel(selectedCondition);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2
          rounded-md border transition-all duration-200
          text-sm font-medium min-w-[140px]
          ${
            isDarkTheme
              ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600"
              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
          }
        `}
      >
        <Filter className="w-4 h-4 flex-shrink-0" />
        <span className="truncate flex-1 text-left">{displayText}</span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`
            absolute top-full left-0 right-0 mt-1
            border rounded-md shadow-lg z-30
            overflow-hidden backdrop-blur-sm
            ${
              isDarkTheme
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-slate-300"
            }
          `}
        >
          {conditions.map((item, index) => (
            <button
              key={item}
              onClick={() => handleClick(item)}
              className={`
                w-full text-left px-4 py-2
                text-sm transition-colors duration-150
                ${
                  index !== conditions.length - 1
                    ? isDarkTheme
                      ? "border-b border-slate-700"
                      : "border-b border-slate-200"
                    : ""
                }
                ${
                  selectedCondition === item
                    ? isDarkTheme
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700"
                    : isDarkTheme
                    ? "text-slate-200 hover:bg-slate-700"
                    : "text-slate-700 hover:bg-slate-50"
                }
              `}
            >
              {getDisplayLabel(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
