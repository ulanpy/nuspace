import { useState } from "react";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import StudentDashboard from "../components/StudentDashboard";
import SGDashboard from "../components/SGDashboard";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/atoms/button";
import { Shield } from "lucide-react";
import { CreateAppealButton } from "../components/CreateAppealButton";
import CreateTicketModal from "../components/CreateTicketModal"; // Import the modal
import { LoginModal } from "@/components/molecules/login-modal";

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

  const sgDashboardButton =
    user && isSgMember ? (
      <Button
        variant="outline"
        onClick={() => setActiveDashboard("sg")}
        className="w-full sm:w-auto"
      >
        <Shield className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">SG Dashboard</span>
        <span className="sm:hidden">SG</span>
      </Button>
    ) : null;

  if (activeDashboard === "sg") {
    return <SGDashboard onBack={() => setActiveDashboard("student")} />;
  }

  return (
    <MotionWrapper>
      <div className="container mx-auto px-4 py-8">
        <StudentDashboard
          user={user}
          sgDashboardButton={sgDashboardButton}
          createAppealButton={<CreateAppealButton onClick={handleCreateAppeal} />}
        />
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