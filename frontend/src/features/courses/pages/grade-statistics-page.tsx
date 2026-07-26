"use client";

import { lazy, startTransition, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "@/router/navigation";
import { BookOpen, BarChart3, CalendarDays, GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import MotionWrapper from "@/components/shared/motion-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/hooks/use-user";
import { apiCall } from "@/utils/api";
import { gradeStatisticsApi } from "../api/grade-statistics-api";
import { useLiveGpaViewModel } from "../hooks/use-live-gpa-view-model";
import { LiveGpaTab } from "../components/live-gpa-tab";
import { coursesSurface } from "../constants/dashboard-theme";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";

const CourseStatsTab = lazy(() =>
  import("../components/course-stats-tab").then((m) => ({ default: m.CourseStatsTab })),
);
const ScheduleBuilderTab = lazy(() =>
  import("../components/schedule-builder-tab").then((m) => ({ default: m.ScheduleBuilderTab })),
);
const DegreeAuditTab = lazy(() =>
  import("../components/degree-audit-tab").then((m) => ({ default: m.DegreeAuditTab })),
);

const tabOptions = [
  { value: "live-gpa", label: "My Courses", icon: BookOpen },
  { value: "course-stats", label: "Statistics", icon: BarChart3 },
  { value: "schedule-builder", label: "Schedule Builder", icon: CalendarDays },
  { value: "degree-audit", label: "Degree Audit", icon: GraduationCap },
] as const;

type TabValue = (typeof tabOptions)[number]["value"];

function isTabValue(value: string | null): value is TabValue {
  return tabOptions.some((t) => t.value === value);
}

function TabPanelFallback() {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
  );
}

export default function GradeStatisticsPage() {
  const { user } = useUser();
  const viewModel = useLiveGpaViewModel(user);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [activeTab, setActiveTab] = useState<TabValue>("live-gpa");
  // Content mounts in a transition so the tab chrome can paint first.
  const [contentTab, setContentTab] = useState<TabValue>("live-gpa");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const coursesQueryKey = ["courses", "infinite", "", "{}"];
    void queryClient.prefetchQuery({
      queryKey: ["grade-terms"],
      queryFn: () => apiCall("/grades/terms"),
    });
    void queryClient.prefetchInfiniteQuery({
      queryKey: coursesQueryKey,
      queryFn: async ({ pageParam = 1 }) => {
        const queryParams = new URLSearchParams();
        queryParams.set("page", String(pageParam));
        queryParams.set("size", "12");
        const res = await apiCall<any>(`/grades?${queryParams.toString()}`);
        if (!res) throw new Error("No response from API");
        if (typeof res.total_pages !== "number" && typeof res.num_of_pages === "number") {
          res.total_pages = res.num_of_pages;
        }
        if (typeof res.page !== "number") {
          res.page = pageParam;
        }
        return res;
      },
      initialPageParam: 1,
    });
    void queryClient.prefetchQuery({
      queryKey: ["degree-audit-catalog"],
      queryFn: gradeStatisticsApi.getDegreeAuditCatalog,
    });
  }, [queryClient]);

  useEffect(() => {
    if (!user) return;
    void queryClient.prefetchQuery({
      queryKey: ["degree-audit-cached"],
      queryFn: () => gradeStatisticsApi.getDegreeAuditStored(),
    });
    void queryClient.prefetchQuery({
      queryKey: ["plannerSchedule"],
      queryFn: gradeStatisticsApi.getPlannerSchedule,
    });
    void queryClient.prefetchQuery({
      queryKey: ["plannerSemesters"],
      queryFn: gradeStatisticsApi.getPlannerSemesters,
    });
  }, [queryClient, user]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!isTabValue(tab) || tab === activeTab) return;
    setActiveTab(tab);
    startTransition(() => {
      setContentTab(tab);
    });
  }, [searchParams, activeTab]);

  const courseStatsKeyword = searchParams.get("keyword") ?? "";

  useEffect(() => {
    const tabElement = tabRefs.current[activeTab];
    if (!tabElement) return;
    tabElement.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    if (!isTabValue(value) || value === activeTab) return;

    // Paint the selected tab immediately; defer heavy panel mount + URL sync.
    setActiveTab(value);
    startTransition(() => {
      setContentTab(value);
      const params = new URLSearchParams(searchParams.toString());
      if (params.get("tab") !== value) {
        params.set("tab", value);
        router.replace(`?${params.toString()}`);
      }
    });
  };

  return (
    <MotionWrapper>
      <PageContainer maxWidth="full" padding="dense" className={coursesSurface.text}>
        <PageHeader
          title="Courses"
          subtitle="Manage your classes, assignments, GPA and semester planning."
          className="mb-4"
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="w-full min-w-max sm:w-auto">
              {tabOptions.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  ref={(el) => {
                    tabRefs.current[value] = el;
                  }}
                  value={value}
                  className="gap-2 rounded-md px-4 transition-none sm:flex-1 sm:justify-center"
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="live-gpa" className="mt-4">
            {contentTab === "live-gpa" ? (
              <LiveGpaTab user={user} viewModel={viewModel} />
            ) : (
              <TabPanelFallback />
            )}
          </TabsContent>

          <TabsContent value="course-stats" className="mt-4">
            {contentTab === "course-stats" ? (
              <Suspense fallback={<TabPanelFallback />}>
                <CourseStatsTab initialKeyword={courseStatsKeyword} />
              </Suspense>
            ) : (
              <TabPanelFallback />
            )}
          </TabsContent>

          <TabsContent value="schedule-builder" className="mt-4">
            {contentTab === "schedule-builder" ? (
              <Suspense fallback={<TabPanelFallback />}>
                <ScheduleBuilderTab user={user} />
              </Suspense>
            ) : (
              <TabPanelFallback />
            )}
          </TabsContent>

          <TabsContent value="degree-audit" className="mt-4">
            {contentTab === "degree-audit" ? (
              <Suspense fallback={<TabPanelFallback />}>
                <DegreeAuditTab user={user} />
              </Suspense>
            ) : (
              <TabPanelFallback />
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </MotionWrapper>
  );
}
