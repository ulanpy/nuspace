import { Outlet } from "react-router-dom";
import { useState } from "react";
import { CommunityModal } from "@/features/campuscurrent/communities/components/CommunityModal";
import { EventModal } from "@/features/campuscurrent/events/components/EventModal";

export function Layout() {
  const [isCreateCommunityModalOpen, setIsCreateCommunityModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);




  return (
    <div className="space-y-6 pb-20">
      {/* Main Content - No tabs needed since only Events remains */}
      <div className="w-full">
        <Outlet />
      </div>

      {/* Create Community Modal */}
      <CommunityModal
        isOpen={isCreateCommunityModalOpen}
        onClose={() => setIsCreateCommunityModalOpen(false)}
        isEditMode={false}
      />

      {/* Create Event Modal */}
      <EventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        isEditMode={false}
      />
    </div>
  );
}
