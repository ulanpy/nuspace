export const OPPORTUNITY_TYPES = [
  "research",
  "internship",
  "summer_school",
  "forum",
  "summit",
  "grant",
  "scholarship",
  "conference",
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const formatOpportunityType = (value?: OpportunityType | null) => {
  if (!value) return "";
  return value
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();
};

export type Opportunity = {
  id: number;
  name: string;
  description?: string | null;
  deadline?: string | null;
  steps?: string | null;
  host?: string | null;
  type: OpportunityType;
  majors?: string | null;
  link?: string | null;
  location?: string | null;
  eligibility?: string | null;
  funding?: string | null;
};

export type OpportunityFilters = {
  type?: OpportunityType;
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
