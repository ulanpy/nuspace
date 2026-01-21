import { apiCall } from "@/utils/api";
import {
  RejectionBoardCreatePayload,
  RejectionBoardEntry,
  RejectionBoardFilters,
  RejectionBoardListResponse,
} from "./types";

export const fetchRejectionBoard = async (
  filters: RejectionBoardFilters,
): Promise<RejectionBoardListResponse> => {
  const params = new URLSearchParams();
  if (filters.rejection_opportunity_type) {
    params.set("rejection_opportunity_type", filters.rejection_opportunity_type);
  }
  if (filters.is_accepted) params.set("is_accepted", filters.is_accepted);
  if (filters.still_trying) params.set("still_trying", filters.still_trying);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.size) params.set("size", String(filters.size));

  const query = params.toString();
  const endpoint = query ? `/rejection-board?${query}` : "/rejection-board";
  return apiCall<RejectionBoardListResponse>(endpoint, {
    method: "GET",
    credentials: "include",
  });
};

export const createRejectionPost = async (
  payload: RejectionBoardCreatePayload,
): Promise<RejectionBoardEntry> => {
  return apiCall<RejectionBoardEntry>("/rejection-board", {
    method: "POST",
    credentials: "include",
    json: payload,
  });
};
