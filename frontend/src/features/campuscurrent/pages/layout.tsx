import { navTabs } from "@/features/campuscurrent/types/nav-tabs";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { CommunityModal } from "@/features/campuscurrent/communities/components/CommunityModal";
import { EventModal } from "@/features/campuscurrent/events/components/EventModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/atoms/tabs";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCreateCommunityModalOpen, setIsCreateCommunityModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  
  let scrollY = Number.parseInt(sessionStorage.getItem("scrollState") ?? "0");
  if (!Number.isInteger(scrollY)) {
    console.error("Scroll restored from sessionStorage is not an integer, defauling to 0");
    scrollY = 0;
  }

  // Store scroll position and previous path for tab navigation
  const [previousPath, setPreviousPath] = useState(location.pathname);

  // Scroll to top on route change unless there's a hash or it's a tab navigation
  useEffect(() => {
    if (!location.hash) {
      // Check if both current and previous paths are tab routes
      const isCurrentTabRoute = navTabs.some(tab => 
        location.pathname === tab.path || location.pathname.startsWith(tab.path)
      );
      
      const isPreviousTabRoute = navTabs.some(tab => 
        previousPath === tab.path || previousPath.startsWith(tab.path)
      );

      // Only restore scroll position if we're navigating between tabs
      if (isCurrentTabRoute && isPreviousTabRoute && location.pathname !== previousPath) {
        // For tab-to-tab navigation, restore saved scroll position
        setTimeout(() => {
          window.scrollTo(0, scrollY);
        }, 0);
      } else {
        sessionStorage.removeItem(`scrollState`)
      }
    }
    
    // Update previous path
    setPreviousPath(location.pathname);
  }, [location.pathname, previousPath]);

  // Save scroll position before navigation
  const handleTabChange = (value: string) => {
    // Save current scroll position before navigating
    sessionStorage.setItem(`scrollState`, window.scrollY.toString());
    navigate(value);
  };

  // Get current active tab based on pathname
  const getCurrentTab = () => {
    const currentPath = location.pathname;
    const activeTab = navTabs.find(tab => 
      currentPath === tab.path || currentPath.startsWith(tab.path)
    );
    return activeTab?.path || navTabs[0].path;
  };




  return (
    <div className="space-y-6 pb-20">
      {/* Navigation Tabs - Full Width */}
      <Tabs
        value={getCurrentTab()}
        onValueChange={handleTabChange}
        className="w-full flex flex-col gap-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          {navTabs.map((tab) => (
            <TabsTrigger key={tab.path} value={tab.path}>
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Main Content */}
        <div className="w-full">
          <Outlet />
        </div>
      </Tabs>

      {/* Create Community Modal */}
      <CommunityModal
        isOpen={isCreateCommunityModalOpen}
        onClose={() => setIsCreateCommunityModalOpen(false)}
        isEditMode={false}
      />

      {/* Create Event Modal */}
      <EventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        isEditMode={false}
      />
    </div>
  );
}
