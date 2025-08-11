"use client";

import { useState } from "react";

import { LoginModal } from "@/components/molecules/login-modal";
import { Button } from "@/components/atoms/button";
import { CommunityModal } from "@/features/campuscurrent/communities/components/CommunityModal";
import { useUser } from "@/hooks/use-user";
import MotionWrapper from "@/components/atoms/motion-wrapper";

// Main component
export default function NUEventsPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isCreateCommunityModalOpen, setIsCreateCommunityModalOpen] = useState(false);
  const { user } = useUser();

  return (
    <MotionWrapper>
      <div className="w-full overflow-x-hidden">
        {/* Join as a Community Section */}
        <section className="py-12">
          <div className="w-full max-w-none px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold">
                Are you a student community?
              </h2>
              <p className="text-muted-foreground">
                Log in to the platform with your NU account, and create your community's profile.
              </p>
              <Button
                onClick={() => {
                  if (user) {
                    setIsCreateCommunityModalOpen(true);
                  } else {
                    setShowLoginModal(true);
                  }
                }}
                size="lg"
              >
                Register Your Community
              </Button>
            </div>
          </div>
        </section>

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {}}
          title="Login Required"
          message="You need to be logged in to create a community."
        />

        {/* Create Community Modal */}
        <CommunityModal
          isOpen={isCreateCommunityModalOpen}
          onClose={() => setIsCreateCommunityModalOpen(false)}
          isEditMode={false}
        />
      </div>
    </MotionWrapper>
  );
}
