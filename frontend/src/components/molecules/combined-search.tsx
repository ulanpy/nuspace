"use client";
import { SearchInput } from "./search-input";
import { ConditionDropdown } from "./condition-dropdown";
import { PreSearchedProduct } from "@/features/kupi-prodai/types";

interface CombinedSearchProps {
  // Search props
  inputValue: string;
  setInputValue: (value: string) => void;
  preSearchedProducts: PreSearchedProduct[] | null;
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
  preSearchedProducts,
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
        preSearchedProducts={preSearchedProducts}
        handleSearch={handleSearch}
        setKeyword={setKeyword}
        setSelectedCondition={setSelectedCondition}
      />
    </div>
  );
}