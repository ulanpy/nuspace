"use client";

import { useState } from "react";

import { LoginModal } from "@/components/molecules/login-modal";
import { Button } from "@/components/atoms/button";
import MotionWrapper from "@/components/atoms/motion-wrapper";

// Main component
export default function NUEventsPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);

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
                Log in to the platform with your NU account, and fill in the
                form to create your community's profile.
              </p>
              <Button
                onClick={() =>
                  window.open("https://forms.gle/rsrAWGMCsYEeBg1y9", "_blank")
                }
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
          message="You need to be logged in to add events to your Google Calendar."
        />
      </div>
    </MotionWrapper>
  );
}
