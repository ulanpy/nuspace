import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import { ROUTES } from "@/data/routes";

export const getPostsQueryOptions = queryOptions({
  queryKey: ["campusCurrentPost"],
  queryFn: () => {
    return apiCall<Types.PaginatedResponse<NuEvents.Post, "posts">>(`${ROUTES.APPS.CAMPUS_CURRENT.POSTS}/posts`);
  },
});

// Create new post API function
export const createPost = async (postData: NuEvents.CommunityPostRequest): Promise<NuEvents.CommunityPostResponse> => {
  return apiCall<NuEvents.CommunityPostResponse>(`${ROUTES.APPS.CAMPUS_CURRENT.POSTS}/posts`, {
    method: "POST",
    json: postData,
  });
};

// Get posts with query parameters
export const getPosts = async (params: {
  community_id: number;
  size?: number;
  page?: number;
  keyword?: string;
}): Promise<NuEvents.ListCommunityPostResponse> => {
  const searchParams = new URLSearchParams();
  searchParams.append("community_id", params.community_id.toString());
  
  if (params.size) searchParams.append("size", params.size.toString());
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.keyword) searchParams.append("keyword", params.keyword);

  return apiCall<NuEvents.ListCommunityPostResponse>(`${ROUTES.APPS.CAMPUS_CURRENT.POSTS}/posts?${searchParams.toString()}`);
};