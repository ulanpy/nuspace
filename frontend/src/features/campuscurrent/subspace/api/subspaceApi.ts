import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";
import type {
  CreatePostData,
  UpdatePostData,
  SubspacePost,
  SubspacePostDetail,
} from "@/features/campuscurrent/subspace/types";

export const subspaceApi = {
  baseKey: ["campusCurrent", "posts"] as const,

  getPostsQueryOptions: (params: {
    community_id?: number | null;
    page?: number;
    size?: number;
    keyword?: string | null;
  } = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.set("page", String(params.page ?? 1));
    queryParams.set("size", String(params.size ?? 12));
    if (params.community_id != null) {
      queryParams.set("community_id", String(params.community_id));
    }
    if (params.keyword) {
      queryParams.set("keyword", String(params.keyword));
    }

    return {
      queryKey: [...subspaceApi.baseKey, "list", params] as const,
      queryFn: async () => {
        const res = await apiCall<any>(`/${Routes.POSTS}?${queryParams.toString()}`);
        if (
          res &&
          typeof res.total_pages !== "number" &&
          typeof res.num_of_pages === "number"
        ) {
          res.total_pages = res.num_of_pages;
        }
        return res as Types.PaginatedResponse<SubspacePost, "posts">;
      },
    };
  },

  getPostQueryOptions: (id: string | number) => {
    return queryOptions({
      queryKey: [...subspaceApi.baseKey, "detail", String(id)] as const,
      queryFn: () => apiCall<SubspacePostDetail>(`/${Routes.POSTS}/${id}`),
    });
  },

  createPost: (data: CreatePostData) => {
    return apiCall<SubspacePostDetail>(`/${Routes.POSTS}`, {
      method: "POST",
      json: {
        user_sub: data.user_sub ?? "me",
        ...data,
      },
    });
  },

  updatePost: (id: string | number, data: UpdatePostData) => {
    return apiCall<SubspacePostDetail>(`/${Routes.POSTS}/${id}`, {
      method: "PATCH",
      json: data,
    });
  },

  deletePost: (id: string | number) => {
    return apiCall<void>(`/${Routes.POSTS}/${id}`, {
      method: "DELETE",
    });
  },
};


