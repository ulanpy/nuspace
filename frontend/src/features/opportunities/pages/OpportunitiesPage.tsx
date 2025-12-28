import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { Search, Loader2, Plus, Eye, EyeOff } from "lucide-react";
import { createOpportunity, fetchOpportunities, updateOpportunity } from "../api";
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
import { OpportunityCard } from "../components/OpportunityCard";
import { Button } from "@/components/atoms/button";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { OpportunityForm } from "../components/OpportunityForm";
import { useUser } from "@/hooks/use-user";
import { queryClient } from "@/utils/query-client";
import { Modal } from "@/components/atoms/modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/atoms/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";

const ALLOWED_OPPORTUNITY_EMAILS = [
  "ministry.innovations@nu.edu.kz",
  "bob@example.com",
] as const;

type OptionItem = { label: string; value: string };

const MultiCheckboxDropdown = ({
  label,
  options,
  selected,
  onChange,
  placeholder = "All",
}: {
  label?: string;
  options: OptionItem[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) => {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const allSelected = selected.length === options.length;

  const display =
    selected.length === 0
      ? placeholder
      : selected.length === options.length
        ? "All"
        : `${selected.length} selected`;

  return (
    <div className="flex h-full flex-col justify-end gap-1">
      {label ? <Label className="text-xs text-gray-500">{label}</Label> : null}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-11">
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
    hide_expired: false,
    type: [],
    majors: [],
    education_level: [],
    min_year: undefined,
    max_year: undefined,
  });
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setIsFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: UpsertOpportunityInput }) =>
      updateOpportunity(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setIsFormOpen(false);
      setEditing(null);
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

  const header = (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Opportunities Digest</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Research opportunities, summer internships, forums and summits are collected specifically for NU students. Majors listed are not strict requirements—feel free to explore other majors if the opportunity fits you. Always double-check details on the official program pages; this list is to help you discover options. Check this page regularly—MRI keeps updating it.
      </p>
    </div>
  );

  const handleSubmitForm = (payload: UpsertOpportunityInput) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <MotionWrapper>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {header}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 rounded-2xl bg-white/80 p-4 shadow-sm border border-gray-200 backdrop-blur dark:bg-gray-900/70 dark:border-gray-800">
            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="q" className="text-xs text-gray-500">
                Search
              </Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="q"
                  value={filters.q || ""}
                  onChange={(e) => onChange("q", e.target.value)}
                  placeholder="Search name or description"
                  className="pl-9 h-11"
                />
              </div>
            </div>

            <MultiCheckboxDropdown
              label="Type"
              options={typeOptions}
              selected={(filters.type as string[]) || []}
              onChange={(next) => setFilters((prev) => ({ ...prev, type: next, page: 1 }))}
            />

            <MultiCheckboxDropdown
              label="Education level"
              options={levelOptions}
              selected={(filters.education_level as string[]) || []}
              onChange={(next) => setFilters((prev) => ({ ...prev, education_level: next, page: 1 }))}
            />

            <MultiCheckboxDropdown
              label="Year"
              options={yearOptions}
              selected={
                filters.min_year && filters.max_year
                  ? Array.from(
                      new Set(
                        Array.from(
                          { length: filters.max_year - filters.min_year + 1 },
                          (_, i) => String((filters.min_year || 0) + i)
                        )
                      )
                    )
                  : []
              }
              onChange={(next) => {
                if (next.length === 0) {
                  setFilters((prev) => ({ ...prev, min_year: undefined, max_year: undefined, page: 1 }));
                  return;
                }
                const nums = next.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
                const min = Math.min(...nums);
                const max = Math.max(...nums);
                setFilters((prev) => ({ ...prev, min_year: min, max_year: max, page: 1 }));
              }}
            />

            <MultiCheckboxDropdown
              label="Majors"
              options={majorOptions}
              selected={(filters.majors as string[]) || []}
              onChange={(next) => setFilters((prev) => ({ ...prev, majors: next, page: 1 }))}
              className="md:col-span-2 lg:col-span-2"
            />
            <div className="flex h-full flex-col justify-end gap-2 md:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-3">
                <Button
                  variant={filters.hide_expired ? "default" : "outline"}
                  className="flex h-11 items-center gap-2 whitespace-nowrap"
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      hide_expired: !prev.hide_expired,
                      page: 1,
                    }));
                  }}
                >
                  {filters.hide_expired ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {filters.hide_expired ? "Show expired" : "Hide expired"}
                </Button>
                <div className="flex h-11 items-center text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  <span className="whitespace-nowrap">{displayTotal} results</span>
                  {isFetching && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                </div>
              </div>
            </div>

            {canManage && (
              <div className="flex h-full flex-col justify-end gap-2 md:col-span-2 lg:col-span-1 lg:col-start-6 items-end">
                <Button className="flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap text-center" onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Opportunity
                </Button>
              </div>
            )}
          </div>

          {canManage && (
            <Modal
              isOpen={isFormOpen}
              onClose={() => { setIsFormOpen(false); setEditing(null); }}
              title={editing ? "Edit Opportunity" : "Add Opportunity"}
              className="max-w-2xl"
            >
              <OpportunityForm
                initial={editing}
                onSubmit={handleSubmitForm}
                onCancel={() => { setIsFormOpen(false); setEditing(null); }}
              />
            </Modal>
          )}

          {/* Results */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12 text-gray-500 dark:text-gray-400">
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
                      onEdit={(o) => { setEditing(o); setIsFormOpen(true); }}
                    />
                  ))}
                </div>
                {hasNextPage && <div ref={loadMoreRef} />}
                {isFetchingNextPage && (
                  <div className="flex justify-center py-4 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading more...
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-10 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-400">
                No opportunities match your filters.
              </div>
            )}
          </div>

          {/* Load more */}
          {visibleData.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {filteredCount} of {displayTotal} {displayTotal === 1 ? "item" : "items"}
              </div>
              {!hasNextPage && (
                <div className="text-sm text-gray-400 dark:text-gray-500">End of list</div>
              )}
            </div>
          )}
        </div>
      </div>
    </MotionWrapper>
  );
}
