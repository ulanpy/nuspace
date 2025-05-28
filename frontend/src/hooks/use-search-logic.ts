"use client";

import { useListingState } from "@/context/listing-context";
import { usePreSearchProducts } from "@/modules/kupi-prodai/api/hooks/use-pre-search-products";
import { useSearchProducts } from "@/modules/kupi-prodai/api/hooks/use-search-products";
import { getSearchTextFromURL } from "@/utils/search-params";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type SearchLogicProps = {
  baseRoute: string;
  searchParam: string;
  setSelectedCategory?: (category: string) => void;
};

export const useSearchLogic = ({
  baseRoute,
  searchParam = "text",
  setSelectedCategory,
}: SearchLogicProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [inputValue, setInputValue] = useState(
    getSearchTextFromURL(location.search)
  );
  const { preSearchedProducts } = usePreSearchProducts(inputValue);
  const { searchedProducts } = useSearchProducts();
  const { setSearchQuery, setCurrentPage } = useListingState();
  useEffect(() => {
    const textFromURL = getSearchTextFromURL(location.search);
    setSearchQuery(textFromURL);
  }, [location.search]);

  const handleSearch = (inputValue: string) => {
    if (!!inputValue.trim()) {
      setSearchQuery(inputValue);
      setCurrentPage(1);
      setSelectedCategory?.("");
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
    searchedProducts,
    preSearchedProducts,
  };
};
