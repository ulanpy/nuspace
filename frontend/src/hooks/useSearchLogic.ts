"use client";

import { useListingState } from "@/context/listing-context";
import { usePreSearchProducts } from "@/modules/kupi-prodai/hooks/use-pre-search-products";
import { useSearchProducts } from "@/modules/kupi-prodai/hooks/use-search-products";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type SearchLogic = {
  baseRoute: string;
  searchParam: string;
};

export const getSearchTextFromURL = (query: string) => {
  const params = new URLSearchParams(query);
  return params.get("text") || "";
};

export const useSearchLogic = ({
  baseRoute,
  searchParam = "text",
}: SearchLogic) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [inputValue, setInputValue] = useState(
    getSearchTextFromURL(location.search)
  );
  const { preSearchedProducts } = usePreSearchProducts(inputValue);
  const { searchedProducts } = useSearchProducts();
  const { setSearchQuery } = useListingState();
  useEffect(() => {
    const textFromURL = getSearchTextFromURL(location.search);
    setSearchQuery(textFromURL);
  }, [location.search]);

  const handleSearch = (inputValue: string) => {
    if (!!inputValue.trim()) {
      setSearchQuery(inputValue);
      navigate(`${baseRoute}?${searchParam}=${encodeURIComponent(inputValue)}`);
    }
    if (inputValue.trim() === "") {
      navigate("/apps/kupi-prodai");
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
