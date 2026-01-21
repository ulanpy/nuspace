export const REJECTION_TYPES = [
  "research",
  "internship",
  "scholarship",
  "job",
  "grad_school",
  "other",
] as const;

export type RejectionOpportunityType = (typeof REJECTION_TYPES)[number];

export type YesNo = "YES" | "NO";
export type IsAccepted = YesNo;
export type StillTrying = YesNo;

export type RejectionBoardEntry = {
  id: number;
  title: string;
  reflection: string;
  rejection_opportunity_type: RejectionOpportunityType;
  is_accepted: IsAccepted;
  still_trying: StillTrying;
  created_at: string;
  updated_at: string;
};

export type RejectionBoardCreatePayload = {
  title: string;
  reflection: string;
  rejection_opportunity_type: RejectionOpportunityType;
  is_accepted: IsAccepted;
  still_trying: StillTrying;
};

export type RejectionBoardFilters = {
  rejection_opportunity_type?: RejectionOpportunityType;
  is_accepted?: IsAccepted;
  still_trying?: StillTrying;
  page?: number;
  size?: number;
};

export type RejectionBoardListResponse = {
  items: RejectionBoardEntry[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
  has_next: boolean;
};

export const formatRejectionType = (value?: RejectionOpportunityType | null) => {
  if (!value) return "";
  return value
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();
};

export const formatOutcome = (value?: IsAccepted | null) => {
  if (!value) return "";
  return value === "YES" ? "Accepted" : "Rejected";
};

export const formatStillTrying = (value?: StillTrying | null) => {
  if (!value) return "";
  return value === "YES" ? "Still trying" : "Moved on";
};
