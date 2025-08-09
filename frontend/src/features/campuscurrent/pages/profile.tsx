"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { LoginModal } from "@/components/molecules/login-modal";


// Main component
export default function NUEventsPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();

  return (
    <>
    <h1 className="text-center" >Coming soon!</h1>
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
