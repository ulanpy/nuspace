import { apiCall } from "@/api/api";
import { queryOptions } from "@tanstack/react-query";


export const campusCurrentPostQueryOptions = queryOptions({
  queryKey: ["campusCurrentPost"],
  queryFn: () => {
    return apiCall<Types.Post>("/campus/current-post");
  },
});