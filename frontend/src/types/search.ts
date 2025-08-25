export interface PreSearchedItem {
  id: number | string;
  name: string;
}

export type SearchInputProps = {
  inputValue: string;
  setInputValue: (value: string) => void;
  preSearchedItems: PreSearchedItem[] | null;
  handleSearch: (inputValue: string) => void;
  setKeyword: (keyword: string) => void;
  // Optional, used in some contexts (e.g., products) to reset a secondary filter
  setSelectedCondition?: (condition: string) => void;
  placeholder?: string;
};


