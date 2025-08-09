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
  getCommunitiesQueryOptions: {
    queryKey: ["campusCurrent", "communities"],
    queryFn: () => {
      return apiCall<Types.PaginatedResponse<Community, "communities">>(
        `/` + Routes.COMMUNITIES
      );
    },
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

