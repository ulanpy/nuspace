import { ReportCard } from "@/components/molecules/cards/report-card";
import { TeamCard } from "@/components/molecules/cards/team-card";

export function AboutUsSection() {
  return (
    <div className="mb-16">
      <h2 className="text-2xl font-bold mb-8 text-center">About Us</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamCard />
        <ReportCard />
      </div>
    </div>
  );
}
