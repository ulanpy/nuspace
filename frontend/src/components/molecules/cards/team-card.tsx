import { useState } from "react";
import { Card, CardContent } from "@/components/atoms/card";
import { FaUsers } from "react-icons/fa";

import { teamMembers } from "@/data/team-members";
import { TeamMemberCard } from "@/components/molecules/cards";
import { Modal } from "@/components/atoms/modal";
import { useTheme } from "@/context/theme-provider";

export function TeamCard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Card
        className={`text-center cursor-pointer transform transition-transform  ${
          isDark
            ? "bg-gray-800 border-gray-700 hover:bg-slate-800"
            : "bg-white hover:bg-gray-50"
        }`}
        onClick={() => setIsModalOpen(true)}
      >
        <CardContent className="py-8 px-6 flex flex-col items-center">
          <div className="flex items-center justify-center rounded-full overflow-hidden h-24 w-24 mb-5 bg-indigo-600/20">
            <FaUsers className="text-indigo-500" size={42} />
          </div>

          <h3 className="text-xl font-semibold mb-2">All Developers</h3>
          <p
            className={`text-sm mb-4 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Meet our talented development team
          </p>

          <button className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
            View Team
          </button>
        </CardContent>
      </Card>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Our Development Team"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 max-h-[70vh] overflow-y-auto">
          {teamMembers.map((member, index) => (
            <TeamMemberCard
              key={index}
              name={member.name}
              role={member.role}
              imgLink={member.imgLink}
              contacts={member.contacts}
            />
          ))}
        </div>
      </Modal>
    </>
  );
}
