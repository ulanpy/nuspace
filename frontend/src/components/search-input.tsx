"use client";

import { Search } from "lucide-react";
import { Input } from "./ui/input";
type SearchInputProps = {
  inputValue: string;
  setInputValue: (value: string) => void;
  preSearchedProducts: string[] | null;
  handleSearch: (inputValue: string) => void;
};
export function SearchInput({
  inputValue,
  setInputValue,
  preSearchedProducts,
  handleSearch,
}: SearchInputProps) {

  const handleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(inputValue);
    }
  };
  return (
    <>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search items..."
        className="pl-9 text-sm"
        value={inputValue.trim()}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => handleSubmit(e)}
      />
      {preSearchedProducts && preSearchedProducts.length > 0 && (
        <ul className="absolute top-full left-0 right-0 bg-[#020817]  border border-t-0 border-gray-300 shadow-md z-10 rounded-b-lg">
          {preSearchedProducts.map((product, index) => (
            <li
              key={index}
              className="px-4 py-2 hover:bg-gray-900 cursor-pointer"
              onClick={() => {
                setInputValue(product);
              }}
            >
              {product}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
