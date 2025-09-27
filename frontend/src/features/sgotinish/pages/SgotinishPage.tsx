import { useState } from "react";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import StudentDashboard from "../components/StudentDashboard";
import SGDashboard from "../components/SGDashboard";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/atoms/button";
import { Shield } from "lucide-react";
import { CreateAppealButton } from "../components/CreateAppealButton";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";

export default function SgotinishPage() {
  const { user, isLoading, login } = useUser();
  const navigate = useNavigate();
  const [activeDashboard, setActiveDashboard] = useState<"student" | "sg">("student");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const isSgMember = user && ["boss", "capo", "soldier"].includes(user.role);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  const handleCreateAppeal = () => {
    if (!user) {
      setIsLoginModalOpen(true);
    } else {
      navigate(ROUTES.APPS.SGOTINISH.STUDENT.CREATE);
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
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Login Required</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">You need to be logged in to create an appeal.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsLoginModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLogin}>
                Login
              </Button>
            </div>
          </div>
        </div>
      )}
    </MotionWrapper>
  );
}