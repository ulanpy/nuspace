import { NavTabs } from "@/components/molecules/nav-tabs";
import { navTabs } from "@/data/events/nav-tabs";
import { Outlet } from "react-router-dom";

export function EventsLayout() {
  return (
    <div className="space-y-6 pb-20">
      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-3 sm:-mx-4">
        <NavTabs tabs={navTabs} />
      </div>
      <Outlet />
    </div>
  );
}
