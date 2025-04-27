"use client";

import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { useListingState } from "@/context/listing-context";
import {
  useState,
  useEffect,
  useRef,
  KeyboardEvent,
  ChangeEvent,
} from "react";

export function SearchInput({
  inputValue,
  setInputValue,
  preSearchedProducts,
  handleSearch,
}: Types.SearchInputProps) {
  const { setSearchQuery } = useListingState();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = preSearchedProducts || [];
  const hasSuggestions = Boolean(suggestions.length && inputValue.trim());

  useEffect(() => {
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);

    const isInputFocused = document.activeElement === inputRef.current;
    isInputFocused && hasSuggestions && setIsDropdownOpen(true);
  }, [preSearchedProducts, hasSuggestions]);

  const handlers = {
    selectItem: (item: string) => {
      setInputValue(item);
      setSearchQuery(item);
      handleSearch(item);
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
    },

    keyActions:  {
      ArrowDown: () =>
        hasSuggestions &&
        (setIsDropdownOpen(true),
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )),
      ArrowUp: () =>
        hasSuggestions &&
        (setIsDropdownOpen(true),
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )),
      Enter: () => {
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handlers.selectItem(suggestions[selectedIndex]);
        } else {
          handleSearch(inputValue);
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
        handler && (e.preventDefault(), handler());
      },
      focus: () => hasSuggestions && setIsDropdownOpen(true),
      blur: () => setTimeout(() => setIsDropdownOpen(false), 200),
    },
  };

  return (
    <>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder="Search items..."
        className="pl-9 text-sm"
        value={inputValue.trim()}
        onChange={handlers.input.change}
        onKeyDown={handlers.input.keyDown}
        onFocus={handlers.input.focus}
        onBlur={handlers.input.blur}
      />

      {isDropdownOpen && hasSuggestions && (
        <ul
          className="absolute top-full left-0 right-0 bg-[#020817] border border-t-0 border-gray-300 shadow-md z-10 rounded-b-lg"
          onMouseLeave={() => setSelectedIndex(-1)}
        >
          {suggestions.map((product, index) => (
            <li
              key={index}
              className={`px-4 py-2 cursor-pointer ${
                index === selectedIndex
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-900"
              }`}
              onClick={() => handlers.selectItem(product)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {product}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
