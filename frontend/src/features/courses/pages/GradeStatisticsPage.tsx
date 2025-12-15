"use client";

import { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, BarChart3, CalendarDays, GraduationCap } from "lucide-react";

import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { useUser } from "@/hooks/use-user";
import { useLiveGpaViewModel } from "../hooks/useLiveGpaViewModel";
import { LiveGpaTab } from "../components/LiveGpaTab";
import { CourseStatsTab } from "../components/CourseStatsTab";
import { ScheduleBuilderTab } from "../components/ScheduleBuilderTab";
import { DegreeAuditTab } from "../components/DegreeAuditTab";

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
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize tab from query param (?tab=...)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab");
    if (tab && tabOptions.some((t) => t.value === tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

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
    const params = new URLSearchParams(location.search);
    params.set("tab", value);
    navigate({ search: params.toString() }, { replace: true });
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

