"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { Search, Loader2, Plus, Eye, EyeOff, SlidersHorizontal, X } from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { createOpportunity, deleteOpportunity, fetchOpportunities, updateOpportunity } from "../api";
import {
  Opportunity,
  OpportunityFilters,
  UpsertOpportunityInput,
  OpportunityListResponse,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_MAJORS,
  EDUCATION_LEVELS,
  formatEducationLevel,
  formatOpportunityType,
} from "../types";
import { OpportunityCard } from '../components/opportunity-card';
import { Button } from "@/components/ui/button";
import MotionWrapper from "@/components/shared/motion-wrapper";
import { Input } from "@/components/ui/input";
import { OpportunityForm } from '../components/opportunity-form';
import { useUser } from "@/hooks/use-user";
import { queryClient } from "@/utils/query-client";
import { Modal } from "@/components/shared/modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/toast";
import { coursesSurface } from "@/features/courses/constants/dashboard-theme";
import { cn } from "@/utils/utils";

const ALLOWED_OPPORTUNITY_EMAILS = [
  "ministry.innovations@nu.edu.kz",
  "bob@example.com",
] as const;

type OptionItem = { label: string; value: string };
type FastApiValidationDetail = {
  loc?: Array<string | number>;
  msg?: string;
};

const FASTAPI_SCOPE_KEYS = new Set(["body", "query", "path", "header"]);

const toSentenceCase = (value: string): string => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatValidationDetail = (item: unknown): string | null => {
  if (!item || typeof item !== "object") return null;
  const detail = item as FastApiValidationDetail;
  const message = typeof detail.msg === "string" ? detail.msg.trim() : "";
  if (!message) return null;

  const location = Array.isArray(detail.loc)
    ? detail.loc
        .filter((part): part is string => typeof part === "string" && !FASTAPI_SCOPE_KEYS.has(part))
        .map((part) => part.replace(/_/g, " "))
    : [];

  if (location.length === 0) {
    return toSentenceCase(message);
  }
  return `${toSentenceCase(location.join(" ")).trim()}: ${message}`;
};

const extractMutationErrorMessage = async (
  error: unknown,
  fallback: string,
): Promise<string> => {
  const response =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: Response }).response
      : undefined;

  if (response instanceof Response) {
    try {
      const cloned = response.clone();
      const contentType = cloned.headers.get("content-type") || "";
      const rawText = await cloned.text();

      if (rawText.trim()) {
        if (contentType.includes("application/json")) {
          const data = JSON.parse(rawText) as { detail?: unknown };
          if (typeof data.detail === "string" && data.detail.trim()) {
            return data.detail.trim();
          }
          if (Array.isArray(data.detail)) {
            const messages = data.detail
              .map((item) => formatValidationDetail(item))
              .filter((msg): msg is string => Boolean(msg));
            if (messages.length > 0) {
              return Array.from(new Set(messages)).join(". ");
            }
          }
        }
        return rawText.trim();
      }
    } catch {
      // Keep fallback below.
    }

    if (response.status === 401) return "Please sign in before creating or editing opportunities.";
    if (response.status === 403) return "You do not have permission to manage opportunities.";
    return `${fallback} (HTTP ${response.status})`;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const MultiCheckboxDropdown = ({
  label,
  options,
  selected,
  onChange,
  placeholder = "All",
  className,
}: {
  label?: string;
  options: OptionItem[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}) => {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const allSelected = selected.length === options.length;

  const displayLabel = label ?? placeholder;
  const display =
    selected.length === 0
      ? displayLabel
      : selected.length === options.length
        ? `${displayLabel} · All`
        : `${displayLabel} · ${selected.length}`;

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 w-full justify-between">
            <span className="truncate text-left">{display}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Select</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => onChange(allSelected ? [] : options.map((o) => o.value))}
            >
              {allSelected ? "Clear all" : "Select all"}
            </Button>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {options.map((opt) => {
              const active = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className="flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1 text-left text-sm hover:border-border/60 hover:bg-muted/40"
                >
                  <span
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border text-[10px] leading-none ${active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}
                  >
                    {active ? "✓" : ""}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default function OpportunitiesPage() {
  const typeOptions = useMemo<OptionItem[]>(
    () => OPPORTUNITY_TYPES.map((t) => ({ value: t, label: formatOpportunityType(t) })),
    []
  );

  const majorOptions = useMemo<OptionItem[]>(
    () => OPPORTUNITY_MAJORS.map((m) => ({ value: m, label: m })),
    []
  );

  const levelOptions = useMemo<OptionItem[]>(
    () => EDUCATION_LEVELS.map((lvl) => ({ value: lvl, label: formatEducationLevel(lvl) })),
    []
  );

  const yearOptions = useMemo<OptionItem[]>(
    () => [1, 2, 3, 4].map((y) => ({ value: String(y), label: `Year ${y}` })),
    []
  );

  const [filters, setFilters] = useState<OpportunityFilters>({
    page: 1,
    size: 15,
    hide_expired: true,
    type: [],
    majors: [],
    education_level: [],
    min_year: undefined,
    max_year: undefined,
  });
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { user } = useUser();

  const userEmail = user?.email?.toLowerCase();
  const canManage =
    !!user &&
    (["admin", "boss"].includes(user.role) ||
      (userEmail ? ALLOWED_OPPORTUNITY_EMAILS.includes(userEmail) : false));

  const {
    data,
    isLoading,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<OpportunityListResponse>({
    queryKey: ["opportunities", { ...filters, page: undefined }],
    queryFn: ({ pageParam = 1 }) => fetchOpportunities({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      if (lastPage.has_next === true) {
        return (lastPage.page ?? 1) + 1;
      }
      return undefined;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: UpsertOpportunityInput) => createOpportunity(payload),
    onMutate: () => {
      setSubmitError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setIsFormOpen(false);
      setSubmitError(null);
    },
    onError: async (error) => {
      setSubmitError(await extractMutationErrorMessage(error, "Could not create the opportunity."));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: UpsertOpportunityInput }) =>
      updateOpportunity(payload.id, payload.data),
    onMutate: () => {
      setSubmitError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setIsFormOpen(false);
      setEditing(null);
      setSubmitError(null);
    },
    onError: async (error) => {
      setSubmitError(await extractMutationErrorMessage(error, "Could not update the opportunity."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOpportunity(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      if (editing?.id === id) {
        setEditing(null);
        setIsFormOpen(false);
        setSubmitError(null);
      }
      toast({
        title: "Opportunity deleted",
        description: "The opportunity has been removed.",
        variant: "success",
      });
    },
    onError: async (error) => {
      const message = await extractMutationErrorMessage(error, "Could not delete the opportunity.");
      toast({
        title: "Delete failed",
        description: message,
        variant: "error",
      });
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const allItems = useMemo<Opportunity[]>(() => {
    return data?.pages.flatMap((page) => page.items || []) ?? [];
  }, [data]);

  const visibleData = useMemo(() => {
    const items = allItems || [];
    if (!filters.hide_expired) return items;
    const today = new Date(new Date().toDateString());
    return items.filter((opp) => {
      if (!opp.deadline) return true; // Year-round stays
      const d = new Date(opp.deadline);
      if (Number.isNaN(d.getTime())) return true;
      return d >= today;
    });
  }, [allItems, filters.hide_expired]);

  const totalCount = useMemo(() => {
    const firstPage = data?.pages?.[0];
    if (typeof firstPage?.total === "number") return firstPage.total;
    return allItems.length;
  }, [data?.pages, allItems.length]);

  const filteredCount = visibleData.length;
  const displayTotal = totalCount; // always show backend total for current filters

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.type?.length ||
      filters.majors?.length ||
      filters.education_level?.length ||
      filters.min_year ||
      filters.max_year ||
      !filters.hide_expired,
  );

  const clearFilters = () => {
    setFilters({
      page: 1,
      size: 15,
      hide_expired: true,
      type: [],
      majors: [],
      education_level: [],
      min_year: undefined,
      max_year: undefined,
    });
  };

  const onChange = (field: keyof OpportunityFilters, value: string | number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value === "" ? undefined : (value as any),
      page: 1,
    }));
  };

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasNextPage) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { rootMargin: "200px" },
      );
      observerRef.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const handleSubmitForm = (payload: UpsertOpportunityInput) => {
    setSubmitError(null);
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmittingForm = createMutation.isPending || updateMutation.isPending;

  const handleDeleteOpportunity = (opportunity: Opportunity) => {
    if (deleteMutation.isPending) return;
    const confirmed = window.confirm(`Delete "${opportunity.name}"? This action cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(opportunity.id);
    deleteMutation.mutate(opportunity.id);
  };

  return (
    <MotionWrapper>
      <div className="min-h-screen bg-background">
        <PageContainer maxWidth="full" padding="dense" className="space-y-4">
          <PageHeader
            title="Opportunities"
            subtitle="Research, internships, forums and summits curated for NU students."
            className="mb-4"
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
            <aside className={cn("space-y-4 p-3 xl:sticky xl:top-4", coursesSurface.cardLg)}>
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2 font-semibold">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  Filters
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearFilters}>
                    <X className="mr-1 h-3.5 w-3.5" /> Clear
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <MultiCheckboxDropdown label="Type" options={typeOptions} selected={(filters.type as string[]) || []} onChange={(next) => setFilters((prev) => ({ ...prev, type: next, page: 1 }))} />
                <MultiCheckboxDropdown label="Education level" options={levelOptions} selected={(filters.education_level as string[]) || []} onChange={(next) => setFilters((prev) => ({ ...prev, education_level: next, page: 1 }))} />
                <MultiCheckboxDropdown
                  label="Year"
                  options={yearOptions}
                  selected={filters.min_year && filters.max_year ? Array.from({ length: filters.max_year - filters.min_year + 1 }, (_, i) => String(filters.min_year! + i)) : []}
                  onChange={(next) => {
                    if (next.length === 0) return setFilters((prev) => ({ ...prev, min_year: undefined, max_year: undefined, page: 1 }));
                    const years = next.map(Number).filter((year) => !Number.isNaN(year));
                    setFilters((prev) => ({ ...prev, min_year: Math.min(...years), max_year: Math.max(...years), page: 1 }));
                  }}
                />
                <MultiCheckboxDropdown label="Majors" options={majorOptions} selected={(filters.majors as string[]) || []} onChange={(next) => setFilters((prev) => ({ ...prev, majors: next, page: 1 }))} />
              </div>

              <Button
                variant={filters.hide_expired ? "secondary" : "outline"}
                className="w-full justify-start gap-2"
                onClick={() => setFilters((prev) => ({ ...prev, hide_expired: !prev.hide_expired, page: 1 }))}
              >
                {filters.hide_expired ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {filters.hide_expired ? "Active opportunities" : "Including expired"}
              </Button>
              <p className="px-1 text-xs leading-relaxed text-muted-foreground">Majors are a guide, not a strict requirement. Always check the official programme page.</p>
            </aside>

            <main className="min-w-0 space-y-4">
              <section className={cn("flex flex-col gap-3 p-3 sm:flex-row sm:items-center", coursesSurface.cardLg)}>
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="q" value={filters.q || ""} onChange={(e) => onChange("q", e.target.value)} placeholder="Search opportunities" className="h-10 pl-9" />
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="whitespace-nowrap text-sm text-muted-foreground">
                    {displayTotal} {displayTotal === 1 ? "opportunity" : "opportunities"}
                    {isFetching && <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />}
                  </div>
                  {canManage && (
                    <Button size="sm" className="gap-2" onClick={() => { setSubmitError(null); setEditing(null); setIsFormOpen(true); }}>
                      <Plus className="h-4 w-4" /> Add opportunity
                    </Button>
                  )}
                </div>
              </section>

          {canManage && (
            <Modal
              isOpen={isFormOpen}
              onClose={() => {
                setIsFormOpen(false);
                setEditing(null);
                setSubmitError(null);
              }}
              title={editing ? "Edit Opportunity" : "Add Opportunity"}
              className="max-w-2xl"
            >
              <OpportunityForm
                initial={editing}
                onSubmit={handleSubmitForm}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditing(null);
                  setSubmitError(null);
                }}
                submitError={submitError}
                isSubmitting={isSubmittingForm}
              />
            </Modal>
          )}

          {/* Results */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : visibleData && visibleData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {visibleData.map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      canManage={canManage}
                      onEdit={(o) => {
                        setSubmitError(null);
                        setEditing(o);
                        setIsFormOpen(true);
                      }}
                      onDelete={handleDeleteOpportunity}
                      isDeleting={deletingId === opp.id && deleteMutation.isPending}
                    />
                  ))}
                </div>
                {hasNextPage && <div ref={loadMoreRef} />}
                {isFetchingNextPage && (
                  <div className="flex justify-center py-4 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more...
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-muted-foreground">
                <p className="font-medium text-foreground">Your filters have excellent taste — nothing made the cut.</p>
                <p className="mt-1 text-sm">Try widening them a little; your next plot twist may be one click away.</p>
              </div>
            )}
          </div>

          {/* Load more */}
          {visibleData.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredCount} of {displayTotal} {displayTotal === 1 ? "item" : "items"}
              </div>
              {!hasNextPage && (
                <div className="text-sm text-muted-foreground/70">End of list</div>
              )}
            </div>
          )}
            </main>
          </div>
        </PageContainer>
      </div>
    </MotionWrapper>
  );
}
