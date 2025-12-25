export type Opportunity = {
  id: number;
  name: string;
  description?: string | null;
  deadline?: string | null;
  steps?: string | null;
  host?: string | null;
  type?: string | null;
  majors?: string | null;
  link?: string | null;
  location?: string | null;
  eligibility?: string | null;
  funding?: string | null;
};

export type OpportunityFilters = {
  type?: string;
  majors?: string;
  eligibility?: string;
  q?: string;
  hide_expired?: boolean;
  page?: number;
  size?: number;
};

export type UpsertOpportunityInput = Partial<Omit<Opportunity, "id">>;

export type OpportunityListResponse = {
  items: Opportunity[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
  has_next: boolean;
};
