import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/utils/api";
import { PreSearchedItem } from "@/types/search";

export const usePreSearchGrades = (inputValue: string) => {
  const keyword = String(inputValue || "").trim();
  const { data } = useQuery({
    queryKey: ["pre-search-grades", keyword],
    enabled: !!keyword,
    queryFn: async ({ signal }) => {
      const res = await apiCall<any>(
        `/search/?keyword=${encodeURIComponent(keyword)}&storage_name=grade_reports&page=1&size=10`,
        { signal },
      );
      return res as Array<{ id: number | string; course_code: string; course_title: string }>;
    },
  });

  const preSearchedItems: PreSearchedItem[] | null = Array.isArray(data)
    ? data.map((grade) => ({ 
        id: grade.id, 
        name: `${grade.course_code} - ${grade.course_title}` 
      }))
    : null;

  return { preSearchedItems };
};
