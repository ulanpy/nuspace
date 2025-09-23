import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Shield, BookOpen } from "lucide-react";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import StudentDashboard from "../components/StudentDashboard";
import SGDashboard from "../components/SGDashboard";
import { useState } from "react";


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
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">SGotinish</h1>
              <p className="text-gray-600 dark:text-gray-400">Modern student government appeal system</p>
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <div className="grid gap-4 max-w-4xl mx-auto md:grid-cols-2">
          {/* Student Card */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setCurrentView('student')}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Student</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Create appeals, track their status and communicate with SG representatives
              </p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                onClick={() => setCurrentView('student')}
              >
                Access Student Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* SG Member Card */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setCurrentView('sg')}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                <Shield className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">SG Representative</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Manage student appeals, track metrics and resolve issues efficiently
              </p>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                onClick={() => setCurrentView('sg')}
              >
                Access SG Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer Note */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-12 py-4">
          SGotinish • Integrated into Nuspace
        </div>
      </div>
    </MotionWrapper>
  );
};

export default SgotinishPage;