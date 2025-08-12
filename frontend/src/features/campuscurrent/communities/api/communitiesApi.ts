import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";
import {
  Community,
  CreateCommunityData,
  EditCommunityData,
  CommunityPermissions,
} from "@/features/campuscurrent/types/types";

export const campuscurrentAPI = {
  getCommunitiesQueryOptions: (params: { page?: number; size?: number; keyword?: string | null; category?: string | null; recruitment_status?: string | null } = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.set("page", String(params.page ?? 1));
    queryParams.set("size", String(params.size ?? 12));
    if (params.keyword) queryParams.set("keyword", String(params.keyword));
    if (params.category) queryParams.set("community_category", String(params.category));
    if (params.recruitment_status) queryParams.set("recruitment_status", String(params.recruitment_status));

    return {
      queryKey: ["campusCurrent", "communities", params],
      queryFn: async () => {
        const res = await apiCall<any>(
          `/` + Routes.COMMUNITIES + `?` + queryParams.toString()
        );
        // Normalize num_of_pages -> total_pages for backward compatibility
        if (
          res &&
          typeof res.total_pages !== "number" &&
          typeof res.num_of_pages === "number"
        ) {
          res.total_pages = res.num_of_pages;
        }
        return res as Types.PaginatedResponse<Community, "communities">;
      },
    };
  },
  getCommunityQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ["campusCurrent", "community", id],
      queryFn: () => {
        return apiCall<{ community: Community; permissions: CommunityPermissions }>(
          `/` + Routes.COMMUNITIES + `/${id}`
        );
      },
    });
  },
  addCommunity: (data: CreateCommunityData) => {
    return apiCall<Community>(`/` + Routes.COMMUNITIES, {
      method: "POST",
      json: data,
    });
  },

  editCommunity: (id: string, data: EditCommunityData) => {
    return apiCall<Community>(`/` + Routes.COMMUNITIES + `/${id}`, {
      method: "PATCH",
      json: data,
    });
  },

  deleteCommunity: (id: string) => {
    return apiCall(`/` + Routes.COMMUNITIES + `/${id}`, {
      method: "DELETE",
    });
  },
};

