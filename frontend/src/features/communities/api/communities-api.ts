import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";
import {
  Community,
  CreateCommunityData,
  EditCommunityData,
  CommunityPermissions,
} from "@/features/shared/campus/types";

export const campuscurrentAPI = {
  getCommunitiesQueryOptions: (params: { page?: number; size?: number; keyword?: string | null; category?: string | null; recruitment_status?: string | null } = {}) => {
    const normalizedParams = {
      page: params.page ?? 1,
      size: params.size ?? 12,
      keyword: params.keyword ?? null,
      category: params.category ?? null,
      recruitment_status: params.recruitment_status ?? null,
    } as const;

    const queryParams = new URLSearchParams();
    queryParams.set("page", String(normalizedParams.page));
    queryParams.set("size", String(normalizedParams.size));
    if (normalizedParams.keyword) queryParams.set("keyword", String(normalizedParams.keyword));
    if (normalizedParams.category) queryParams.set("community_category", String(normalizedParams.category));
    if (normalizedParams.recruitment_status)
      queryParams.set("recruitment_status", String(normalizedParams.recruitment_status));

    return {
      queryKey: [
        "campusCurrent",
        "communities",
        normalizedParams.page,
        normalizedParams.size,
        normalizedParams.keyword ?? "",
        normalizedParams.category ?? "",
        normalizedParams.recruitment_status ?? "",
      ] as const,
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
        const items = (res as any)?.items ?? (res as any)?.communities ?? [];
        return { ...res, items } as Types.PaginatedResponse<Community, "communities">;
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

  getUserCommunitiesQueryOptions: (userSub: string) => {
    return queryOptions({
      queryKey: ["campusCurrent", "userCommunities", userSub],
      queryFn: async () => {
        const queryParams = new URLSearchParams();
        queryParams.set("head", userSub);
        queryParams.set("size", "100"); // Get all communities for the user
        queryParams.set("page", "1");
        
        const res = await apiCall<any>(
          `/` + Routes.COMMUNITIES + `?` + queryParams.toString()
        );
        const items = (res as any)?.items ?? (res as any)?.communities ?? [];
        return { ...res, items } as Types.PaginatedResponse<Community, "communities">;
      },
    });
  },

  // Achievements API
  createAchievement: (data: { community_id: number; description: string; year: number }) => {
    return apiCall<any>(`/` + Routes.COMMUNITIES + `/${data.community_id}/achievements`, {
      method: "POST",
      json: data,
    });
  },

  updateAchievement: (communityId: number, achievementId: number, data: { description?: string; year?: number }) => {
    return apiCall<any>(`/` + Routes.COMMUNITIES + `/${communityId}/achievements/${achievementId}`, {
      method: "PATCH",
      json: data,
    });
  },

  deleteAchievement: (communityId: number, achievementId: number) => {
    return apiCall(`/` + Routes.COMMUNITIES + `/${communityId}/achievements/${achievementId}`, {
      method: "DELETE",
    });
  },

  getAchievementsQueryOptions: (communityId: number, page: number = 1, size: number = 20) => {
    return queryOptions({
      queryKey: ["campusCurrent", "community", communityId, "achievements", page, size],
      queryFn: async () => {
        const queryParams = new URLSearchParams();
        queryParams.set("page", String(page));
        queryParams.set("size", String(size));
        
        return apiCall<{ achievements: any[]; total_pages: number }>(
          `/` + Routes.COMMUNITIES + `/${communityId}/achievements?` + queryParams.toString()
        );
      },
    });
  },

  // Photo Albums API
  createPhotoAlbum: (data: { community_id: number; album_url: string; description?: string; album_type?: string; album_date?: string }) => {
    return apiCall<any>(`/` + Routes.COMMUNITIES + `/${data.community_id}/albums`, {
      method: "POST",
      json: data,
    });
  },

  updatePhotoAlbum: (communityId: number, albumId: number, data: { album_url?: string; description?: string; album_type?: string; album_date?: string }) => {
    return apiCall<any>(`/` + Routes.COMMUNITIES + `/${communityId}/albums/${albumId}`, {
      method: "PATCH",
      json: data,
    });
  },

  deletePhotoAlbum: (communityId: number, albumId: number) => {
    return apiCall(`/` + Routes.COMMUNITIES + `/${communityId}/albums/${albumId}`, {
      method: "DELETE",
    });
  },

  refreshPhotoAlbumMetadata: (communityId: number, albumId: number) => {
    return apiCall<any>(`/` + Routes.COMMUNITIES + `/${communityId}/albums/${albumId}/refresh`, {
      method: "POST",
    });
  },

  refreshAllPhotoAlbums: (communityId: number) => {
    return apiCall<any>(`/` + Routes.COMMUNITIES + `/${communityId}/albums/refresh`, {
      method: "POST",
    });
  },

  getPhotoAlbumsQueryOptions: (communityId: number, page: number = 1, size: number = 20, albumType?: string | null) => {
    return queryOptions({
      queryKey: ["campusCurrent", "community", communityId, "albums", page, size, albumType ?? ""],
      queryFn: async () => {
        const queryParams = new URLSearchParams();
        queryParams.set("page", String(page));
        queryParams.set("size", String(size));
        if (albumType) queryParams.set("album_type", albumType);
        
        return apiCall<{ albums: any[]; total_pages: number; total: number; page: number; size: number; has_next: boolean }>(
          `/` + Routes.COMMUNITIES + `/${communityId}/albums?` + queryParams.toString()
        );
      },
    });
  },
};
