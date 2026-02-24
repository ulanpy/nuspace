"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import StudentDashboard from '../components/student-dashboard';
import SGDashboard from '../components/sg-dashboard';
import { useUser } from "@/hooks/use-user";
import { Shield, GraduationCap, Users } from "lucide-react";
import { CreateAppealButton } from '../components/create-appeal-button';
import CreateTicketModal from '../components/create-ticket-modal'; // Import the modal
import { LoginModal } from "@/components/molecules/login-modal";
import { TelegramConnectCard } from '../components/telegram-connect-card';
import { Tabs, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { SGMembersManagement } from "../components/sg-members-management";

type DashboardTab = "student" | "sg-tickets" | "sg-members";

export default function SgotinishPage() {
  const { user, isLoading, login } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: DashboardTab =
    tabParam === "sg-members"
      ? "sg-members"
      : tabParam === "sg" || tabParam === "sg-tickets"
        ? "sg-tickets"
        : "student";
  const [activeDashboard, setActiveDashboard] = useState<DashboardTab>(initialTab);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCreateTicketModalOpen, setCreateTicketModalOpen] = useState(false); // State for the new modal

  const isSgMember = user && ["boss", "capo", "soldier"].includes(user.role);

  const handleCreateAppeal = () => {
    if (!user) {
      setIsLoginModalOpen(true);
    } else {
      setCreateTicketModalOpen(true); // Open the modal instead of navigating
    }
  };

  const handleLogin = () => {
    login();
    setIsLoginModalOpen(false);
  };

  const effectiveDashboard: DashboardTab = isSgMember ? activeDashboard : "student";

  const renderDashboardContent = () => {
    if (effectiveDashboard === "sg-tickets") {
      return <SGDashboard />;
    }
    if (effectiveDashboard === "sg-members") {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">SG Members</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage SG hierarchy and membership permissions.
            </p>
          </div>
          <SGMembersManagement currentUser={user} />
        </div>
      );
    }

    return (
      <StudentDashboard
        user={user}
        createAppealButton={<CreateAppealButton onClick={handleCreateAppeal} />}
      />
    );
  };

  useEffect(() => {
    if (!isSgMember) return;
    const params = new URLSearchParams(searchParams.toString());
    if (activeDashboard === "student") {
      params.delete("tab");
    } else {
      params.set("tab", activeDashboard);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl);
  }, [activeDashboard, isSgMember, searchParams, router]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MotionWrapper>
      <div>
        {user && !user.tg_id && (
          <TelegramConnectCard user={user} className="mb-6" />
        )}
        {isSgMember && (
          <Tabs
            value={effectiveDashboard}
            onValueChange={(value) => setActiveDashboard((value as DashboardTab))}
            className="mb-6"
          >
            <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-muted/60">
              <TabsTrigger value="student" className="gap-2">
                <GraduationCap className="h-4 w-4" />
                <span>Student</span>
              </TabsTrigger>
              <TabsTrigger value="sg-tickets" className="gap-2">
                <Shield className="h-4 w-4" />
                <span>SG Tickets</span>
              </TabsTrigger>
              <TabsTrigger value="sg-members" className="gap-2">
                <Users className="h-4 w-4" />
                <span>SG Members</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {renderDashboardContent()}
      </div>

      {/* Render the Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLogin}
        title="Login Required"
        message="You need to be logged in to create a new appeal."
      />

      {/* Render the Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateTicketModalOpen}
        onClose={() => setCreateTicketModalOpen(false)}
        onSuccess={() => {
          setCreateTicketModalOpen(false);
          // Optional: Show a success toast notification here
        }}
      />
    </MotionWrapper>
  );
}
