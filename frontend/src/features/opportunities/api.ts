import { apiCall } from "@/utils/api";
import { Opportunity, OpportunityFilters, OpportunityListResponse } from "./types";

export const fetchOpportunities = async (
  filters: OpportunityFilters,
): Promise<OpportunityListResponse> => {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.majors) params.set("majors", filters.majors);
  if (filters.education_level) params.set("education_level", filters.education_level);
  if (typeof filters.min_year === "number") params.set("min_year", String(filters.min_year));
  if (typeof filters.max_year === "number") params.set("max_year", String(filters.max_year));
  if (filters.q) params.set("q", filters.q);
  if (filters.hide_expired) params.set("hide_expired", "true");
  if (filters.page) params.set("page", String(filters.page));
  if (filters.size) params.set("size", String(filters.size));

  const query = params.toString();
  const endpoint = query ? `/opportunities?${query}` : "/opportunities";

  return apiCall<OpportunityListResponse>(endpoint, { method: "GET", credentials: "include" });
};

export const createOpportunity = async (payload: Partial<Opportunity>): Promise<Opportunity> => {
  return apiCall<Opportunity>("/opportunities", {
    method: "POST",
    credentials: "include",
    json: payload,
  });
};

export const updateOpportunity = async (
  id: number,
  payload: Partial<Opportunity>,
): Promise<Opportunity> => {
  return apiCall<Opportunity>(`/opportunities/${id}`, {
    method: "PATCH",
    credentials: "include",
    json: payload,
  });
};

export const deleteOpportunity = async (id: number): Promise<void> => {
  await apiCall<void>(`/opportunities/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
};
