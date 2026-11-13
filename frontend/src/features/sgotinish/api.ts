import { apiCall } from "@/utils/api";

export interface CategoryStat {
  slug: string;
  name: string;
  count: number;
}

export interface OtinishPublicStats {
  total_tickets: number;
  answered_tickets: number;
  closed_tickets: number;
  tickets_last_7_days: number;
  tickets_last_30_days: number;
  unique_students: number;
  by_category: CategoryStat[];
}

export const sgotinishApi = {
  getPublicStats: () => apiCall<OtinishPublicStats>("/sgotinish/stats"),
};
