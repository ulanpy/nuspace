"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "@/router/navigation";
import { BookOpen, BarChart3, CalendarDays, GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { useUser } from "@/hooks/use-user";
import { apiCall } from "@/utils/api";
import { gradeStatisticsApi } from "../api/grade-statistics-api";
import { useLiveGpaViewModel } from "../hooks/use-live-gpa-view-model";
import { LiveGpaTab } from "../components/live-gpa-tab";
import { CourseStatsTab } from "../components/course-stats-tab";
import { ScheduleBuilderTab } from "../components/schedule-builder-tab";
import { DegreeAuditTab } from "../components/degree-audit-tab";
import { coursesSurface } from "../constants/dashboard-theme";
import { cn } from "@/utils/utils";

const tabOptions = [
  { value: "live-gpa", label: "My Courses", icon: BookOpen },
  { value: "course-stats", label: "Statistics", icon: BarChart3 },
  { value: "schedule-builder", label: "Schedule Builder", icon: CalendarDays },
  { value: "degree-audit", label: "Degree Audit", icon: GraduationCap },
] as const;

export default function GradeStatisticsPage() {
  const { user, login } = useUser();
  const viewModel = useLiveGpaViewModel(user);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [activeTab, setActiveTab] = useState("live-gpa");
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
    if (tab && tabOptions.some((t) => t.value === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const courseStatsKeyword = searchParams.get("keyword") ?? "";

  useEffect(() => {
    const tabElement = tabRefs.current[activeTab];
    if (tabElement) {
      setTimeout(() => {
        tabElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }, 0);
    }
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <MotionWrapper>
      <div className={cn("mx-auto max-w-[1560px] space-y-6 px-2 py-2 sm:px-4 sm:py-4", coursesSurface.text)}>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground">
            Manage your classes, assignments, GPA and semester planning.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div ref={scrollContainerRef} className="overflow-x-auto">
            <TabsList className={cn("mb-2 inline-flex h-12 w-full min-w-max rounded-[14px] border p-1 sm:w-auto", coursesSurface.card)}>
              {tabOptions.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  ref={(el) => {
                    tabRefs.current[value] = el;
                  }}
                  value={value}
                  className={cn(
                    "relative flex h-10 items-center gap-2 rounded-[10px] px-4 py-2 text-sm text-muted-foreground data-[state=active]:shadow-none after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-transparent",
                    coursesSurface.tabActive,
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="live-gpa" className="mt-6">
            <LiveGpaTab user={user} login={login} viewModel={viewModel} />
          </TabsContent>

          <TabsContent value="course-stats" className="mt-6">
            <CourseStatsTab initialKeyword={courseStatsKeyword} />
          </TabsContent>

          <TabsContent value="schedule-builder" className="mt-6">
            <ScheduleBuilderTab user={user} login={login} />
          </TabsContent>

          <TabsContent value="degree-audit" className="mt-6">
            <DegreeAuditTab user={user} login={login} />
          </TabsContent>
        </Tabs>
      </div>
    </MotionWrapper>
  );
}
