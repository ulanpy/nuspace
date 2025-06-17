"use client";

import { usePreSearchProducts } from "@/modules/kupi-prodai/api/hooks/use-pre-search-products";
import { useProducts } from "@/modules/kupi-prodai/api/hooks/use-products";
import { getSearchTextFromURL } from "@/utils/search-params";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type SearchLogicProps<T = string> = {
  setKeyword: (keyword: string) => void;
  setPage: (page: number) => void;
  baseRoute: string;
  searchParam: string;
  setSelectedCategory?: (category: T) => void;
};

export const useSearchLogic = <T>({
  setKeyword,
  setPage,
  baseRoute,
  searchParam = "text",
  setSelectedCategory,
}: SearchLogicProps<T>) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [inputValue, setInputValue] = useState(
    getSearchTextFromURL(location.search)
  );
  const { preSearchedProducts } = usePreSearchProducts(inputValue);

  useEffect(() => {
    const textFromURL = getSearchTextFromURL(location.search);
    setKeyword(textFromURL);
  }, [location.search]);

  const handleSearch = (inputValue: string) => {
    if (!!inputValue.trim()) {
      setKeyword(inputValue);
      setPage(1);
      setSelectedCategory?.("" as T);
      navigate(`${baseRoute}?${searchParam}=${encodeURIComponent(inputValue)}`);
    }
    if (!inputValue.trim()) {
      navigate(baseRoute);
    }
  };

  return {
    inputValue,
    setInputValue,
    handleSearch,
    preSearchedProducts,
  };
};
