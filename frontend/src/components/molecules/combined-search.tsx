"use client";
import { SearchInput } from "./search-input";
import { ConditionDropdown } from "./condition-dropdown";
import { PreSearchedItem } from "@/types/search";

interface CombinedSearchProps {
  // Search props
  inputValue: string;
  setInputValue: (value: string) => void;
  preSearchedItems: PreSearchedItem[] | null;
  handleSearch: (query: string) => void;
  setKeyword: (keyword: string) => void;
  
  // Condition props
  conditions: string[];
  selectedCondition: string;
  setSelectedCondition: (condition: string) => void;
}

export function CombinedSearch({
  inputValue,
  setInputValue,
  preSearchedItems,
  handleSearch,
  setKeyword,
  conditions,
  selectedCondition,
  setSelectedCondition,
}: CombinedSearchProps) {
  return (
    <div className="flex w-full">
      <ConditionDropdown
        conditions={conditions}
        selectedCondition={selectedCondition}
        setSelectedCondition={setSelectedCondition}
      />
      <SearchInput
        inputValue={inputValue}
        setInputValue={setInputValue}
        preSearchedItems={preSearchedItems}
        handleSearch={handleSearch}
        setKeyword={setKeyword}
        setSelectedCondition={setSelectedCondition}
      />
    </div>
  );
}