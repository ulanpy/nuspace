import { ReportCard } from "@/components/organisms/about/report-card";
import { TeamCard } from "@/components/organisms/about/team-card";

export function AboutUsSection() {
  return (
    <div className="mb-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamCard />
        <ReportCard />
      </div>
    </div>
  );
}
