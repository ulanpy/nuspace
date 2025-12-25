import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, Loader2, Plus, Eye, EyeOff } from "lucide-react";
import { createOpportunity, fetchOpportunities, updateOpportunity } from "../api";
import {
  Opportunity,
  OpportunityFilters,
  UpsertOpportunityInput,
  OpportunityListResponse,
  OPPORTUNITY_TYPES,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";

export default function OpportunitiesPage() {
  const [filters, setFilters] = useState<OpportunityFilters>({
    page: 1,
    size: 15,
    hide_expired: false,
  });
  const [accItems, setAccItems] = useState<Opportunity[]>([]);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { user } = useUser();

  const canManage =
    !!user && ["admin", "boss"].includes(user.role);

  const { data, isLoading, isFetching } = useQuery<OpportunityListResponse>({
    queryKey: ["opportunities", filters],
    queryFn: () => fetchOpportunities({ ...filters }),
    keepPreviousData: true,
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

  const baseFilterKey = useMemo(
    () =>
      `${filters.type ?? ""}|${filters.majors ?? ""}|${filters.eligibility ?? ""}|${filters.q ?? ""}|${filters.hide_expired ? "hide" : "all"}|${filters.size ?? 15}`,
    [
      filters.type,
      filters.majors,
      filters.eligibility,
      filters.q,
      filters.hide_expired,
      filters.size,
    ]
  );
  const prevBaseFilterKey = useRef(baseFilterKey);

  useEffect(() => {
    if (!data) return;
    // If base filters changed, reset the accumulator
    if (baseFilterKey !== prevBaseFilterKey.current) {
      setAccItems(data.items || []);
      prevBaseFilterKey.current = baseFilterKey;
      return;
    }
    // Otherwise append new page results, deduping by id
    setAccItems((prev) => {
      const map = new Map<number, Opportunity>();
      prev.forEach((item) => map.set(item.id, item));
      (data.items || []).forEach((item) => map.set(item.id, item));
      return Array.from(map.values());
    });
  }, [data, baseFilterKey]);

  const visibleData = useMemo(() => {
    const items = accItems || [];
    if (!filters.hide_expired) return items;
    const today = new Date(new Date().toDateString());
    return items.filter((opp) => {
      if (!opp.deadline) return true; // Year-round stays
      const d = new Date(opp.deadline);
      if (Number.isNaN(d.getTime())) return true;
      return d >= today;
    });
  }, [accItems, filters.hide_expired]);

  const totalCount = useMemo(() => {
    if (typeof data?.total === "number") return data.total;
    return accItems.length;
  }, [data?.total, accItems.length]);

  const filteredCount = visibleData.length;
  const displayTotal = totalCount; // always show backend total for current filters

  const moreAvailable = useMemo(() => {
    const pageSize = filters.size || 15;
    const hasNextFlag = data?.has_next === true;
    const fetchedCount = accItems.length;
    const lastPageCount = data?.items?.length ?? 0;
    if (hasNextFlag) return true;
    if (totalCount > 0 && fetchedCount < totalCount) return true;
    return lastPageCount >= pageSize;
  }, [data?.has_next, data?.items?.length, accItems.length, totalCount, filters.size]);

  const options = useMemo(() => {
    const tokenize = (value: string | null | undefined) => {
      if (!value) return [];
      return value
        .split(/[;,]/)
        .map((v) => v.trim())
        .filter(Boolean);
    };

    const collectTokens = (values: (string | null | undefined)[]) => {
      const set = new Set<string>();
      values.forEach((val) => tokenize(val).forEach((t) => set.add(t)));
      return Array.from(set)
        .filter((v) => v.toLowerCase() !== "all")
        .sort();
    };

    const items = accItems || [];

    return {
      types: OPPORTUNITY_TYPES,
      eligibilities: collectTokens(items.map((d) => d.eligibility)),
      majors: collectTokens(items.map((d) => d.majors)),
    };
  }, [accItems]);

  const onChange = (field: keyof OpportunityFilters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
      page: 1,
    }));
  };

  const onPageChange = (delta: number) => {
    setFilters((prev) => ({
      ...prev,
      page: Math.max(1, (prev.page || 1) + delta),
    }));
  };

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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {header}
          </div>

          {canManage && (
            <div className="flex justify-end">
              <>
                <Button className="flex items-center gap-2" onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Opportunity
                </Button>
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
              </>
            </div>
          )}

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
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type" className="text-xs text-gray-500">
                Type
              </Label>
              <Select
                value={filters.type ?? "__all__"}
                onValueChange={(v) => onChange("type", v === "__all__" ? undefined : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {options.types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatOpportunityType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="eligibility" className="text-xs text-gray-500">
                Eligibility
              </Label>
              <Select
                value={filters.eligibility ?? "__all__"}
                onValueChange={(v) => onChange("eligibility", v === "__all__" ? undefined : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All eligibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {options.eligibilities.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="majors" className="text-xs text-gray-500">
                Majors
              </Label>
              <Select
                value={filters.majors ?? "__all__"}
                onValueChange={(v) => onChange("majors", v === "__all__" ? undefined : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All majors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {options.majors.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant={filters.hide_expired ? "default" : "outline"}
                className="flex items-center gap-2 whitespace-nowrap"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    hide_expired: !prev.hide_expired,
                    page: 1,
                  }));
                  setAccItems([]);
                }}
              >
                {filters.hide_expired ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {filters.hide_expired ? "Show expired" : "Hide expired"}
              </Button>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                <span>{displayTotal} results</span>
                {isFetching && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : visibleData && visibleData.length > 0 ? (
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
              <Button
                variant="outline"
                onClick={() => onPageChange(1)}
                disabled={isFetching || !moreAvailable}
                className="flex items-center gap-2"
              >
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Show more
              </Button>
            </div>
          )}
        </div>
      </div>
    </MotionWrapper>
  );
}
