"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "@/router/navigation";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import StudentDashboard from '../components/student-dashboard';
import SGDashboard from '../components/sg-dashboard';
import { useUser } from "@/hooks/use-user";
import { Shield, GraduationCap, Users } from "lucide-react";
import { CreateAppealButton } from '../components/create-appeal-button';
import CreateTicketModal from '../components/create-ticket-modal'; // Import the modal
import { TelegramConnectCard } from '../components/telegram-connect-card';
import { useAuthGate } from "@/hooks/use-auth-gate";
import { AuthWallModal } from "@/components/molecules/auth-wall-modal";
import { PageContainer } from "@/components/atoms/page-container";
import { PageHeader } from "@/components/atoms/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SGMembersManagement } from "../components/sg-members-management";

type DashboardTab = "student" | "sg-tickets" | "sg-members";

export default function SgotinishPage() {
  const { user, isLoading } = useUser();
  const { requireAuth, isModalOpen, closeModal } = useAuthGate();
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
  const [isCreateTicketModalOpen, setCreateTicketModalOpen] = useState(false); // State for the new modal

  const isSgMember = user && ["boss", "capo", "soldier"].includes(user.role);

  const handleCreateAppeal = () => requireAuth(() => setCreateTicketModalOpen(true));

  const effectiveDashboard: DashboardTab = isSgMember ? activeDashboard : "student";

  const renderDashboardContent = () => {
    if (effectiveDashboard === "sg-tickets") {
      return <SGDashboard />;
    }
    if (effectiveDashboard === "sg-members") {
      return (
        <PageContainer padding="default">
          <PageHeader title="SG Members" subtitle="Manage SG hierarchy and membership permissions." />
          <SGMembersManagement currentUser={user} />
        </PageContainer>
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
      <PageContainer padding="none">
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
      </PageContainer>

      {/* Render the Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateTicketModalOpen}
        onClose={() => setCreateTicketModalOpen(false)}
        onSuccess={() => {
          setCreateTicketModalOpen(false);
          // Optional: Show a success toast notification here
        }}
      />
      <AuthWallModal
        isOpen={isModalOpen}
        onClose={closeModal}
        message="You need to be logged in to create a new appeal."
      />
    </MotionWrapper>
  );
}
