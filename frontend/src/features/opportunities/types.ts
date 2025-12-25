export type Opportunity = {
  opp_id: number;
  opp_name: string;
  opp_description?: string | null;
  opp_deadline?: string | null;
  opp_steps?: string | null;
  opp_host?: string | null;
  opp_type?: string | null;
  opp_majors?: string | null;
  opp_link?: string | null;
  opp_location?: string | null;
  opp_eligibility?: string | null;
  opp_funding?: string | null;
};

export type OpportunityFilters = {
  opp_type?: string;
  opp_majors?: string;
  opp_eligibility?: string;
  q?: string;
  hide_expired?: boolean;
  page?: number;
  size?: number;
};

export type UpsertOpportunityInput = Partial<Omit<Opportunity, "opp_id">>;

export type OpportunityListResponse = {
  items: Opportunity[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
  has_next: boolean;
};
