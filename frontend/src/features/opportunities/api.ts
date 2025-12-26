import { apiCall } from "@/utils/api";
import { Opportunity, OpportunityFilters, OpportunityListResponse } from "./types";

export const fetchOpportunities = async (
  filters: OpportunityFilters,
): Promise<OpportunityListResponse> => {
  const params = new URLSearchParams();
  const appendList = (key: string, value: string | string[]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else {
      params.append(key, value);
    }
  };

  if (filters.type) appendList("type", filters.type as any);
  if (filters.majors) appendList("majors", filters.majors as any);
  if (filters.education_level) appendList("education_level", filters.education_level as any);
  if (filters.years) filters.years.forEach((y) => params.append("years", String(y)));
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
