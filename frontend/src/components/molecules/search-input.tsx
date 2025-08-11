"use client";

import { Search, X } from "lucide-react";
import { Input } from "../atoms/input";
import { useState, useEffect, useRef, KeyboardEvent, ChangeEvent } from "react";
import { useTheme } from "../../context/ThemeProviderContext";
import { SearchInputProps } from "@/types/search";

export function SearchInput({
  inputValue,
  setInputValue,
  preSearchedItems,
  handleSearch,
  setKeyword,
  setSelectedCondition,
}: SearchInputProps) {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = preSearchedItems || [];
  const hasSuggestions = Boolean(suggestions.length && inputValue.trim());

  useEffect(() => {
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);

    const isInputFocused = document.activeElement === inputRef.current;
    isInputFocused && hasSuggestions && setIsDropdownOpen(true);
  }, [preSearchedItems, hasSuggestions]);

  const handlers = {
    clear: () => {
      setInputValue("");
      setIsDropdownOpen(false);
      inputRef.current?.focus();
    },
    search: () => {
      // Defer navigation to end of event loop to avoid unexpected scroll reset
      Promise.resolve().then(() => handleSearch(inputValue));
      setSelectedCondition?.("All Conditions");
      setIsDropdownOpen(false);
    },
        selectItem: (item: string) => {
      setInputValue(item);
      setKeyword(item);
      setSelectedCondition?.("All Conditions");
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
      // Use microtask to avoid blur closing before navigation
      Promise.resolve().then(() => handleSearch(item));
    },

    keyActions: {
      ArrowDown: () =>
        hasSuggestions &&
        (setIsDropdownOpen(true),
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        )),
      ArrowUp: () =>
        hasSuggestions &&
        (setIsDropdownOpen(true),
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        )),
      Enter: () => {
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handlers.selectItem(suggestions[selectedIndex].name);
        } else {
          handleSearch(inputValue);
          setSelectedCondition?.("All Conditions");
          setIsDropdownOpen(false);
        }
      },
      Escape: () => {
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
      },
    } as Record<Types.SupportedKey, () => void>,

    input: {
      change: (e: ChangeEvent<HTMLInputElement>) =>
        setInputValue(e.target.value),
      keyDown: (e: KeyboardEvent<HTMLInputElement>) => {
        const key = e.key as Types.SupportedKey;
        const handler = handlers.keyActions[key];
        if (handler) {
          e.preventDefault();
          handler();
        }
      },
      focus: () => hasSuggestions && setIsDropdownOpen(true),
      blur: () => setTimeout(() => setIsDropdownOpen(false), 200),
    },
  };

  return (
    <>
    <div className="relative flex-grow">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder="Search"
        className="text-base pl-9 rounded-l-none border-l-0 resize-none"
        value={inputValue}
        onChange={handlers.input.change}
        onKeyDown={handlers.input.keyDown}
        onFocus={handlers.input.focus}
        onBlur={handlers.input.blur}
      />
      </div>
      {!!inputValue.trim() && (
        <button
          type="button"
          onClick={handlers.clear}
          className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      {/* <div
        onClick={handlers.search}
        className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 ${isDarkTheme ? "bg-slate-600 hover:bg-slate-700" : "bg-slate-200 hover:bg-slate-300"}`}
      >
      </div> */}
      {isDropdownOpen && hasSuggestions && (
        <ul
          className={`absolute top-full left-0 right-0  border border-t-0  shadow-md z-10 rounded-b-lg ${
            isDarkTheme
              ? "bg-[#020817] border-gray-300"
              : "bg-slate-100  border-slate-200"
          }`}
          onMouseLeave={() => setSelectedIndex(-1)}
        >
          {suggestions.map((product, index) => (
            <li
              key={index}
              className={`px-4 py-2 cursor-pointer ${
                index === selectedIndex
                  ? isDarkTheme
                    ? "bg-gray-900 text-white"
                    : "bg-gray-200 text-black"
                  : isDarkTheme
                    ? "text-gray-400 hover:bg-gray-700"
                    : "text-slate-500 hover:bg-slate-300"
              }`}
              onClick={() => handlers.selectItem(product.name)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {product.name}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
