
import { apiCall } from "@/utils/api";

const API_BASE_URL = "/api";

interface SurveyResponseCount {
    survey_responses: number;
}

export const electionsApi = {
    getElectionData: () => {
        return apiCall<SurveyResponseCount>("/elections/counter");
    },

    getCounterStreamUrl: () => {
        return `${API_BASE_URL}/elections/counter/stream`;
    },
};
