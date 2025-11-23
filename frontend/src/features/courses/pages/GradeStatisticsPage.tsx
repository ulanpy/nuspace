"use client";

import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { useUser } from "@/hooks/use-user";
import { useLiveGpaViewModel } from "../hooks/useLiveGpaViewModel";
import { LiveGpaTab } from "../components/LiveGpaTab";
import { CourseStatsTab } from "../components/CourseStatsTab";

export default function GradeStatisticsPage() {
  const { user, login } = useUser();
  const viewModel = useLiveGpaViewModel(user);

  return (
    <MotionWrapper>
      <div className="w-full max-w-none space-y-6">
        <Tabs defaultValue="live-gpa">
          <TabsList className="mb-4 grid w-full grid-cols-2 rounded-full bg-muted/60 p-1">
            <TabsTrigger value="live-gpa">My Courses</TabsTrigger>
            <TabsTrigger value="course-stats">Course Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="live-gpa">
            <LiveGpaTab user={user} login={login} viewModel={viewModel} />
          </TabsContent>

          <TabsContent value="course-stats">
            <CourseStatsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MotionWrapper>
  );
}

