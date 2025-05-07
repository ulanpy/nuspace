import { teamMembers } from "@/data/team-members";
import { TeamSlider } from "../team-slider";
export const TeamSection = () => {

  return (
    <div className="mb-16">
      <h2 className="text-2xl font-bold mb-8 text-center">Our Team</h2>
      <TeamSlider teams={teamMembers} />
    </div>
  );
};
