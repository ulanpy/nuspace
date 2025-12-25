import { apiCall } from "@/utils/api";
import { Opportunity, OpportunityFilters, OpportunityListResponse } from "./types";

export const fetchOpportunities = async (
  filters: OpportunityFilters,
): Promise<OpportunityListResponse> => {
  const params = new URLSearchParams();
  if (filters.opp_type) params.set("opp_type", filters.opp_type);
  if (filters.opp_majors) params.set("opp_majors", filters.opp_majors);
  if (filters.opp_eligibility) params.set("opp_eligibility", filters.opp_eligibility);
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
  opp_id: number,
  payload: Partial<Opportunity>,
): Promise<Opportunity> => {
  return apiCall<Opportunity>(`/opportunities/${opp_id}`, {
    method: "PATCH",
    credentials: "include",
    json: payload,
  });
};

export const deleteOpportunity = async (opp_id: number): Promise<void> => {
  await apiCall<void>(`/opportunities/${opp_id}`, {
    method: "DELETE",
    credentials: "include",
  });
};
