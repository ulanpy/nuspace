import { Link } from "react-router-dom";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Shield, BookOpen } from "lucide-react";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import StudentDashboard from "../components/StudentDashboard";
import SGDashboard from "../components/SGDashboard";
import { useState } from "react";
import { ROUTES } from "@/data/routes";


const SgotinishPage = () => {
  const [currentView, setCurrentView] = useState<'selection' | 'student' | 'sg'>('selection');

  // If a dashboard is selected, render it
  if (currentView === 'student') {
    return <StudentDashboard onBack={() => setCurrentView('selection')} />;
  }

  if (currentView === 'sg') {
    return <SGDashboard onBack={() => setCurrentView('selection')} />;
  }

  return (
    <MotionWrapper>
      <div className="min-h-screen bg-background flex flex-col p-3 sm:p-4 pb-[calc(56px+env(safe-area-inset-bottom))]">
        <div className="container mx-auto px-4 py-6">
          {/* Compact Header */}
          <div className="text-center mb-4">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <span className="text-sm font-semibold">SG</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">SGotinish</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Modern student government appeal system
            </p>
          </div>

          {/* Role Selection */}

          <div className="grid gap-3 sm:gap-4 max-w-3xl mx-auto sm:grid-cols-2">
          {/* Student Card */}
          <Link to={ROUTES.APPS.SGOTINISH.STUDENT.ROOT} className="block">
            <Card className="hover:shadow-card transition-all duration-200 cursor-pointer group h-full">
              <CardHeader className="text-center pb-2 sm:pb-3">
                <div className="mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-primary/20 transition-colors">
                  <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                <CardTitle className="text-base sm:text-lg">Student</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2 sm:space-y-3">
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Create appeals, track their status and communicate with SG representatives
                </p>
                <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-muted-foreground">
                </div>
                <Button variant="default" className="w-full mt-3 sm:mt-4 h-9 sm:h-10 text-sm" onClick={() => setCurrentView('student')}>
                  Sign in as student
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* SG Member Card */}
          <Link to={ROUTES.APPS.SGOTINISH.SG.ROOT} className="block">
            <Card className="hover:shadow-card transition-all duration-200 cursor-pointer group h-full">
              <CardHeader className="text-center pb-2 sm:pb-3">
                <div className="mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-success/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-success/20 transition-colors">
                  <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-success" />
                </div>
                <CardTitle className="text-base sm:text-lg">SG Representative</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2 sm:space-y-3">
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Manage student appeals, track metrics and resolve issues efficiently
                </p>
                <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-muted-foreground">
                </div>
                <Button variant="default" className="w-full mt-3 sm:mt-4 h-9 sm:h-10 text-sm" onClick={() => setCurrentView('sg')}>
                  Sign in as SG representative
                </Button>
              </CardContent>
            </Card>
          </Link>
          </div>
        </div>

        {/* Subtle Footer Note (muted, inline with app pattern) */}
        <div className="w-full mt-auto">
        <div className="text-center text-muted-foreground text-xs sm:text-sm py-3">
          SGotinish • Integrated into Nuspace
        </div>
        </div>
      </div>
    </MotionWrapper>
  );
};

export default SgotinishPage;