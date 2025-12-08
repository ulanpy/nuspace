import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/utils/api";
import { GradeTermsResponse } from "../../types";

export const useGradeTerms = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["grade-terms"],
    queryFn: async ({ signal }) => {
      return apiCall<GradeTermsResponse>("/grades/terms", { signal });
    },
  });

  return {
    terms: data?.terms ?? [],
    isLoading,
  };
};

