"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, BarChart3, CalendarDays, GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { useUser } from "@/hooks/use-user";
import { apiCall } from "@/utils/api";
import { gradeStatisticsApi } from "../api/grade-statistics-api";
import { useLiveGpaViewModel } from '../hooks/use-live-gpa-view-model';
import { LiveGpaTab } from '../components/live-gpa-tab';
import { CourseStatsTab } from '../components/course-stats-tab';
import { ScheduleBuilderTab } from '../components/schedule-builder-tab';
import { DegreeAuditTab } from '../components/degree-audit-tab';

const tabOptions = [
  {
    value: "live-gpa",
    label: "My Courses",
    icon: BookOpen,
  },
  {
    value: "course-stats",
    label: "Course Statistics",
    icon: BarChart3,
  },
  {
    value: "schedule-builder",
    label: "Schedule Builder",
    icon: CalendarDays,
  },
  {
    value: "degree-audit",
    label: "Degree Audit",
    icon: GraduationCap,
  },
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
        if (!res) {
          throw new Error("No response from API");
        }
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

  // Initialize tab from query param (?tab=...)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tabOptions.some((t) => t.value === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const tabElement = tabRefs.current[activeTab];
    if (tabElement) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        tabElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
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
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Courses</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your classes, grade trends, and future schedules.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div ref={scrollContainerRef} className="overflow-x-auto">
            <TabsList className="mb-4 inline-flex w-full min-w-max rounded-full bg-muted/60 p-1 sm:w-auto">
              {tabOptions.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  ref={(el) => {
                    tabRefs.current[value] = el;
                  }}
                  value={value}
                  className="flex items-center gap-2 rounded-full px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="live-gpa">
            <LiveGpaTab user={user} login={login} viewModel={viewModel} />
          </TabsContent>

          <TabsContent value="course-stats">
            <CourseStatsTab />
          </TabsContent>

          <TabsContent value="schedule-builder">
            <ScheduleBuilderTab user={user} login={login} />
          </TabsContent>

          <TabsContent value="degree-audit">
            <DegreeAuditTab user={user} login={login} />
          </TabsContent>
        </Tabs>
      </div>
    </MotionWrapper>
  );
}

