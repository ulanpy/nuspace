import { apiCall } from "@/utils/api";
import { Opportunity, OpportunityFilters, OpportunityListResponse, normalizeOpportunity } from "./types";

export const fetchOpportunities = async (
  filters: OpportunityFilters,
): Promise<OpportunityListResponse> => {
  const params = new URLSearchParams();
  const appendValues = (key: string, value?: string | string[]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else {
      params.append(key, value);
    }
  };

  appendValues("type", filters.type as any);
  appendValues("majors", filters.majors as any);
  appendValues("education_level", filters.education_level as any);
  if (typeof filters.min_year === "number") params.set("min_year", String(filters.min_year));
  if (typeof filters.max_year === "number") params.set("max_year", String(filters.max_year));
  if (filters.q) params.set("q", filters.q);
  if (filters.hide_expired) params.set("hide_expired", "true");
  if (filters.page) params.set("page", String(filters.page));
  if (filters.size) params.set("size", String(filters.size));

  const query = params.toString();
  const endpoint = query ? `/opportunities?${query}` : "/opportunities";

  const response = await apiCall<OpportunityListResponse>(endpoint, { method: "GET", credentials: "include" });
  return {
    ...response,
    items: (response.items || []).map((item) => normalizeOpportunity(item)),
  };
};

export const createOpportunity = async (payload: Partial<Opportunity>): Promise<Opportunity> => {
  const response = await apiCall<Opportunity>("/opportunities", {
    method: "POST",
    credentials: "include",
    json: payload,
  });
  return normalizeOpportunity(response);
};

export const updateOpportunity = async (
  id: number,
  payload: Partial<Opportunity>,
): Promise<Opportunity> => {
  const response = await apiCall<Opportunity>(`/opportunities/${id}`, {
    method: "PATCH",
    credentials: "include",
    json: payload,
  });
  return normalizeOpportunity(response);
};

export const deleteOpportunity = async (id: number): Promise<void> => {
  await apiCall<void>(`/opportunities/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
};
