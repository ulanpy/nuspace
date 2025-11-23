import { Outlet } from "react-router-dom";

export function CampusLayout() {
  return (
    <div className="space-y-6 pb-20">
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  );
}
