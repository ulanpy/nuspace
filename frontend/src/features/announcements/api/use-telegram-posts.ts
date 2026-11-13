
import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/utils/api";

export const useTelegramPosts = () => {
    return useQuery({
        queryKey: ["announcements", "telegram"],
        queryFn: async () => {
            const res = await apiCall<{ latest_post_id: number }>("/announcements/telegram");
            return res.latest_post_id;
        }
    });
};
