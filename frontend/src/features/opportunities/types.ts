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

export const OPPORTUNITY_MAJORS = [
  "Engineering Management",
  "Mechanical and Aerospace Engineering",
  "Electrical and Computer Engineering",
  "Chemical and Materials Engineering",
  "Civil and Environmental Engineering",
  "Biomedical Engineering",
  "Mining Engineering",
  "Petroleum Engineering",
  "Robotics and Mechatronics Engineering",
  "Computer Science",
  "Data Science",
  "Applied Mathematics",
  "Mathematics",
  "Economics",
  "Business Administration",
  "Finance",
  "Life Sciences",
  "Biological Sciences",
  "Medical Sciences",
  "Molecular Medicine",
  "Pharmacology and Toxicology",
  "Public Health",
  "Sports Medicine and Rehabilitation",
  "Nursing",
  "Doctor of Medicine",
  "A Six-Year Medical Program",
  "Chemistry",
  "Physics",
  "Geosciences",
  "Geology",
  "Political Science and International Relations",
  "Public Policy",
  "Public Administration",
  "Eurasian Studies",
  "Sociology",
  "Anthropology",
  "History",
  "Educational Leadership",
  "Multilingual Education",
  "World Languages, Literature and Culture",
] as const;

export type OpportunityMajor = (typeof OPPORTUNITY_MAJORS)[number];

export type Opportunity = {
  id: number;
  name: string;
  description?: string | null;
  deadline?: string | null;
  host?: string | null;
  type: OpportunityType;
  majors?: OpportunityMajor[] | null;
  link?: string | null;
  location?: string | null;
  funding?: string | null;
  eligibility?: OpportunityEligibility[];
};

export type OpportunityFilters = {
  type?: OpportunityType;
  majors?: OpportunityMajor;
  education_level?: EducationLevel;
  min_year?: number;
  max_year?: number;
  q?: string;
  hide_expired?: boolean;
  page?: number;
  size?: number;
};

export type UpsertOpportunityInput = Partial<Omit<Opportunity, "id">>;

export const EDUCATION_LEVELS = ["UG", "GrM", "PhD"] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export type OpportunityEligibility = {
  id?: number;
  education_level: EducationLevel;
  min_year?: number | null;
  max_year?: number | null;
};

export const formatEducationLevel = (value?: EducationLevel | null) => {
  if (!value) return "";
  if (value === "UG") return "Undergraduate";
  if (value === "GrM") return "Master";
  if (value === "PhD") return "PhD";
  return value;
};

export type OpportunityListResponse = {
  items: Opportunity[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
  has_next: boolean;
};
