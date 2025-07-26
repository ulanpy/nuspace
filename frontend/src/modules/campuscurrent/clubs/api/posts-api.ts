import { apiCall } from "@/api/api";
import { queryOptions } from "@tanstack/react-query";
import { ROUTES } from "@/data/routes";

export const campusCurrentPostQueryOptions = queryOptions({
  queryKey: ["campusCurrentPost"],
  queryFn: () => {
    return apiCall<Types.Post>(`${ROUTES.APPS.POSTS}/posts`);
  },
});