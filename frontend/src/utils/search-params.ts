import { defaultPage } from "@/modules/kupi-prodai/api/kupi-prodai-api";

export const getSearchTextFromURL = (query: string) => {
  const params = new URLSearchParams(query);
  return params.get("text") || "";
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
