"use client";

import React, { ReactNode, useCallback, useEffect, useState } from "react";
import { InfiniteList } from "./infinite-list";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PreSearchedItem } from "@/types/search";

export interface SearchableInfiniteListProps<T> {
  // Data fetching props
  queryKey: string[];
  apiEndpoint: string;
  size?: number;
  keyword?: string;
  additionalParams?: Record<string, any>;
  transformResponse?: (response: any) => any;

  // Rendering props
  renderItem: (item: T, index: number) => ReactNode;
  renderEmpty?: () => ReactNode;
  renderLoading?: () => ReactNode;
  renderError?: (error: any) => ReactNode;
  renderLoadMore?: () => ReactNode;

  // Search props
  searchPlaceholder?: string;
  itemCountPlaceholder?: string;
  onSearchChange?: (keyword: string) => void;
  toolbarStart?: ReactNode;

  // Header props
  title?: string;

  // Layout props
  gridLayout?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };

  // Search props
  usePreSearch: (inputValue: string) => { preSearchedItems: PreSearchedItem[] | null };
  setSelectedCondition?: (condition: string) => void;
}

interface SearchToolbarProps {
  keyword: string;
  searchPlaceholder: string;
  toolbarStart?: ReactNode;
  usePreSearch: (inputValue: string) => { preSearchedItems: PreSearchedItem[] | null };
  onSubmit: (value: string) => void;
}

function SearchToolbar({
  keyword,
  searchPlaceholder,
  toolbarStart,
  usePreSearch,
  onSubmit,
}: SearchToolbarProps) {
  const [inputValue, setInputValue] = useState(keyword);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const { preSearchedItems } = usePreSearch(inputValue);

  useEffect(() => {
    setInputValue(keyword);
  }, [keyword]);

  const handleSearch = useCallback(
    (value: string) => {
      onSubmit(value);
    },
    [onSubmit],
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    handleSearch(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (selectedIndex >= 0 && preSearchedItems && preSearchedItems[selectedIndex]) {
        handleSuggestionSelect(preSearchedItems[selectedIndex].name);
      } else {
        handleSearch(inputValue);
      }
      setShowSuggestions(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (preSearchedItems && preSearchedItems.length > 0) {
        setSelectedIndex((prev) =>
          prev < preSearchedItems.length - 1 ? prev + 1 : 0,
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (preSearchedItems && preSearchedItems.length > 0) {
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : preSearchedItems.length - 1,
        );
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div className="relative mb-6 overflow-visible">
      <div className="flex h-11 items-stretch overflow-visible rounded-md border border-input bg-background">
        {toolbarStart}
        <div
          className={cn(
            "relative min-w-0 flex-1 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring focus-within:ring-offset-0",
            toolbarStart ? "rounded-r-md" : "rounded-md",
          )}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="h-full rounded-none border-0 bg-transparent pl-9 pr-10 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {!!inputValue.trim() && (
            <button
              type="button"
              onClick={() => {
                setInputValue("");
                setShowSuggestions(false);
                setSelectedIndex(-1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showSuggestions && preSearchedItems && preSearchedItems.length > 0 && inputValue.trim() && (
        <ul className="absolute top-full left-0 right-0 z-50 max-h-60 overflow-y-auto rounded-b-lg border border-t-0 bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {preSearchedItems.map((item, index) => (
            <li
              key={index}
              className={`cursor-pointer px-4 py-2 text-sm ${
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={() => handleSuggestionSelect(item.name)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SearchableInfiniteList<T>({
  queryKey,
  apiEndpoint,
  size = 12,
  keyword = "",
  additionalParams = {},
  transformResponse,
  renderItem,
  renderEmpty,
  renderLoading,
  renderError,
  renderLoadMore,
  searchPlaceholder = "Search...",
  onSearchChange,
  toolbarStart,
  title,
  gridLayout,
  itemCountPlaceholder = "Items",
  usePreSearch,
  setSelectedCondition: _setSelectedCondition,
}: SearchableInfiniteListProps<T>) {
  const [internalKeyword, setInternalKeyword] = useState(keyword);

  const handleSearch = useCallback(
    (value: string) => {
      setInternalKeyword(value);
      onSearchChange?.(value);
    },
    [onSearchChange],
  );

  useEffect(() => {
    setInternalKeyword(keyword);
  }, [keyword]);

  return (
    <div className="w-full">
      {title && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          {itemCountPlaceholder && (
            <div className="mt-1 text-xs text-muted-foreground">
              {itemCountPlaceholder}: {/* This will be updated by InfiniteList */}
            </div>
          )}
        </div>
      )}

      <SearchToolbar
        keyword={keyword}
        searchPlaceholder={searchPlaceholder}
        toolbarStart={toolbarStart}
        usePreSearch={usePreSearch}
        onSubmit={handleSearch}
      />

      <InfiniteList
        queryKey={queryKey}
        apiEndpoint={apiEndpoint}
        size={size}
        keyword={internalKeyword}
        additionalParams={additionalParams}
        transformResponse={transformResponse}
        renderItem={renderItem}
        renderEmpty={renderEmpty}
        renderLoading={renderLoading}
        renderError={renderError}
        renderLoadMore={renderLoadMore}
        showSearch={false}
        title={undefined}
        gridLayout={gridLayout}
        itemCountPlaceholder={itemCountPlaceholder}
      />
    </div>
  );
}
