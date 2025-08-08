"use client";

import { useState } from "react";
// import { useNavigate } from "react-router-dom";

import { LoginModal } from "@/components/molecules/login-modal";
import { Button } from "@/components/atoms/button";
// Footer is not used here; the layout handles top hero and navigation
import MotionWrapper from "@/components/atoms/motion-wrapper";



// Main component
export default function NUEventsPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  // Navigation handled via layout hero actions



  return (
    <>
      {/* Hero moved to layout */}


      {/* Join as a Community Section */}
      <MotionWrapper>
        <section className="py-12">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold">
                Are you a student community?
              </h2>
              <p className="text-muted-foreground">
                Sign up to create your community profile, post events, and connect with
                students.
              </p>
              <Button size="lg">Register Your Community</Button>
            </div>
          </div>
        </section>
      </MotionWrapper>


      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => { }}
        title="Login Required"
        message="You need to be logged in to add events to your Google Calendar."
      />
    </>
  );
}
