import { defaultPage } from "@/features/kupi-prodai/api/kupiProdaiApi";

export const getSearchTextFromURL = (query: string) => {
  const params = new URLSearchParams(query);
  return params.get("text") || "";
};

export const getSearchParamFromURL = (
  query: string,
  key: string = "text",
): string => {
  const params = new URLSearchParams(query);
  return params.get(key) || "";
};

export const getSeachPageFromURL = (query: string) => {
  const params = new URLSearchParams(query);
  return Number(params.get("page")) || defaultPage;
};

export const getSearchCategoryFromURL = (query: string) => {
  const params = new URLSearchParams(query);
  return params.get("category") || "All";
};
export const getSearchConditionFromURL = (query: string) => {
  const params = new URLSearchParams(query);
  return params.get("condition") || "All Conditions";
};

export const getProductIdFromURL = (query: string) => {
  const params = new URLSearchParams(query);
  console.log(params.get("id"));
};
