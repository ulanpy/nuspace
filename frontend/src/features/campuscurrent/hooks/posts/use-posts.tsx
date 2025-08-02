import { useQuery } from "@tanstack/react-query";
import { getPosts } from "../../utils/posts-api";

interface UsePostsParams {
  community_id: number;
  size?: number;
  page?: number;
  keyword?: string;
}

export const usePosts = (params: UsePostsParams) => {
  return useQuery({
    queryKey: ["campusCurrentPosts", params],
    queryFn: () => getPosts(params),
    enabled: !!params.community_id,
  });
};
