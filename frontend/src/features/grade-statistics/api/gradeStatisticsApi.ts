import { api } from "@/utils/api";
import { GradeStatistics, GradeStatisticsResponse, GradeStatisticsFilters } from "../types";

export const gradeStatisticsApi = {
  getGradeStatistics: async (filters?: GradeStatisticsFilters): Promise<GradeStatisticsResponse> => {
    const params = new URLSearchParams();
    
    if (filters?.keyword) params.append('keyword', filters.keyword);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.size) params.append('size', filters.size.toString());

    const response = await api.get(`/grades?${params.toString()}`);
    return response.data;
  },
};
