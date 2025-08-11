"use client";

import { getSearchTextFromURL } from "@/utils/search-params";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PreSearchedItem } from "@/types/search";

type SearchLogicProps<T = string> = {
  setKeyword: (keyword: string) => void;
  setPage?: (page: number) => void;
  baseRoute: string;
  searchParam: string;
  setSelectedCategory?: (category: T) => void;
  // Provide a function that returns presearch suggestions for the current input
  usePreSearch: (inputValue: string) => { preSearchedItems: PreSearchedItem[] | null };
  // Optional: DOM id to scroll to after initiating a search
  scrollTargetId?: string;
};

export const useSearchLogic = <T>({
  setKeyword,
  setPage,
  baseRoute,
  searchParam = "text",
  setSelectedCategory,
  usePreSearch,
  scrollTargetId,
}: SearchLogicProps<T>) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [inputValue, setInputValue] = useState(
    getSearchTextFromURL(location.search),
  );
  const { preSearchedItems } = usePreSearch(inputValue);

  useEffect(() => {
    const textFromURL = getSearchTextFromURL(location.search);
    setKeyword(textFromURL);
  }, [location.search, setKeyword]);

  const handleSearch = (value: string) => {
    const query = value.trim();
    if (query) {
      setKeyword(query);
      setPage?.(1);
      setSelectedCategory?.("" as T);
      navigate(`${baseRoute}?${searchParam}=${encodeURIComponent(query)}`);
      if (scrollTargetId) {
        // Defer to allow router state to update
        setTimeout(() => {
          document
            .getElementById(scrollTargetId)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
    } else {
      navigate(baseRoute);
      if (scrollTargetId) {
        setTimeout(() => {
          document
            .getElementById(scrollTargetId)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
    }
  };

  return {
    inputValue,
    setInputValue,
    handleSearch,
    preSearchedItems,
  };
};
