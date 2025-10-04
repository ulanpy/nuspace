import { useState } from "react";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import StudentDashboard from "../components/StudentDashboard";
import SGDashboard from "../components/SGDashboard";
import { useUser } from "@/hooks/use-user";
import { Shield, GraduationCap } from "lucide-react";
import { CreateAppealButton } from "../components/CreateAppealButton";
import CreateTicketModal from "../components/CreateTicketModal"; // Import the modal
import { LoginModal } from "@/components/molecules/login-modal";
import { TelegramConnectCard } from "../components/TelegramConnectCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/atoms/tabs";

export default function SgotinishPage() {
  const { user, isLoading, login } = useUser();
  const [activeDashboard, setActiveDashboard] = useState<"student" | "sg">("student");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCreateTicketModalOpen, setCreateTicketModalOpen] = useState(false); // State for the new modal

  const isSgMember = user && ["boss", "capo", "soldier"].includes(user.role);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

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

  const effectiveDashboard = isSgMember ? activeDashboard : "student";

  const dashboardContent = effectiveDashboard === "sg"
    ? <SGDashboard onBack={() => setActiveDashboard("student")} />
    : (
      <StudentDashboard
        user={user}
        createAppealButton={<CreateAppealButton onClick={handleCreateAppeal} />}
      />
    );

  return (
    <MotionWrapper>
      <div className="container mx-auto px-4 py-8">
        <TelegramConnectCard user={user ?? null} className="mb-6" />
        {isSgMember && (
          <Tabs
            value={effectiveDashboard}
            onValueChange={(value) => setActiveDashboard((value as "student" | "sg"))}
            className="mb-6"
          >
            <TabsList className="grid w-full max-w-sm grid-cols-2 bg-muted/60">
              <TabsTrigger value="student" className="gap-2">
                <GraduationCap className="h-4 w-4" />
                <span>Student</span>
              </TabsTrigger>
              <TabsTrigger value="sg" className="gap-2">
                <Shield className="h-4 w-4" />
                <span>SG</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {dashboardContent}
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