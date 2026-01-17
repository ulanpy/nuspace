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
  if (filters.nickname) params.set("nickname", filters.nickname);
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
