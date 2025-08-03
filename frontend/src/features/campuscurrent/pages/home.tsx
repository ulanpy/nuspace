"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { LoginModal } from "@/components/molecules/login-modal";
import { Button } from "@/components/atoms/button";
import Footer from "@/components/molecules/footer";



// Main component
export default function NUEventsPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();



  return (
    <>
      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-blue-700 text-white">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-bold">
                Discover NU Campus Life
              </h1>
              <p className="text-lg md:text-xl text-white/90">
                Find events, join communities, and connect with the Nazarbayev
                University community.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-yellow-500 text-black hover:bg-yellow-600"
                  onClick={() => navigate("events")}
                >
                  <Button>Explore Events</Button>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("communities")}
                  className="border-whitebg-yellow-500 text-black hover:bg-white/10"
                >
                  <Button>Discover Communities</Button>
                </Button>
              </div>
            </div>
            <div className="lg:flex hidden justify-end">
              <div className="w-full max-w-md aspect-video bg-white/10 rounded-lg overflow-hidden">
                <img
                  src="/placeholder.svg"
                  alt="Campus events"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Join as a Community Section */}
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


      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {}}
        title="Login Required"
        message="You need to be logged in to add events to your Google Calendar."
      />
      <Footer />
    </>
  );
}
