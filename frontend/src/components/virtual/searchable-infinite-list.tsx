"use client";

import React, { ReactNode } from 'react';
import { InfiniteList } from './infinite-list';
import { Search, X } from 'lucide-react';
import { Input } from '../atoms/input';
import { PreSearchedItem } from '@/types/search';

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
  title,
  gridLayout,
  itemCountPlaceholder = "Items",
  usePreSearch,
  setSelectedCondition: _setSelectedCondition,
}: SearchableInfiniteListProps<T>) {
  const [internalKeyword, setInternalKeyword] = React.useState(keyword);
  const [inputValue, setInputValue] = React.useState(keyword);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  // Get pre-search suggestions
  const { preSearchedItems } = usePreSearch(inputValue);

  // Handle search submission - this updates the main API keyword
  const handleSearch = (value: string) => {
    setInternalKeyword(value);
    onSearchChange?.(value);
  };

  // Sync with URL changes
  React.useEffect(() => {
    setInternalKeyword(keyword);
    setInputValue(keyword);
  }, [keyword]);

  // Handle input changes
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    handleSearch(suggestion);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (selectedIndex >= 0 && preSearchedItems && preSearchedItems[selectedIndex]) {
        handleSuggestionSelect(preSearchedItems[selectedIndex].name);
      } else {
        handleSearch(inputValue);
      }
      setShowSuggestions(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (preSearchedItems && preSearchedItems.length > 0) {
        setSelectedIndex(prev => prev < preSearchedItems.length - 1 ? prev + 1 : 0);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (preSearchedItems && preSearchedItems.length > 0) {
        setSelectedIndex(prev => prev > 0 ? prev - 1 : preSearchedItems.length - 1);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };



  return (
    <div className="w-full">
      {/* Header */}
      {title && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          {/* Debug info */}
          {itemCountPlaceholder && (
            <div className="text-xs text-muted-foreground mt-1">
              {itemCountPlaceholder}: {/* This will be updated by InfiniteList */}
            </div>
          )}
        </div>
      )}

      {/* Search Input with Suggestions */}
      <div className="mb-6 relative">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="text-base pl-9 resize-none"
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
              className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Suggestions Dropdown */}
        {showSuggestions && preSearchedItems && preSearchedItems.length > 0 && inputValue.trim() && (
          <ul className="absolute top-full left-0 right-0 border border-t-0 shadow-md z-50 rounded-b-lg max-h-60 overflow-y-auto bg-background">
            {preSearchedItems.map((item, index) => (
              <li
                key={index}
                className={`px-4 py-2 cursor-pointer ${
                  index === selectedIndex
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
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

      {/* Infinite List */}
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
        showSearch={false} // We handle search separately
        title={undefined} // We handle title separately
        gridLayout={gridLayout}
        itemCountPlaceholder={itemCountPlaceholder}
      />
    </div>
  );
}
