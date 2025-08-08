"use client";

import type React from "react";

import { useLocation, Link } from "react-router-dom";
import { cn } from "@/utils/utils";
import { ROUTES } from "@/data/routes";

interface Tab {
  name: string;
  path: string;
  icon?: React.ReactNode;
}

interface NavTabsProps {
  tabs: Tab[];
}

export const NavTabs = ({ tabs }: NavTabsProps) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="border-b">
      <ul className="flex px-4">
        {tabs.map((tab) => {
          const isActive =
            (tab.path === ROUTES.APPS.CAMPUS_CURRENT.ROOT &&
              currentPath === ROUTES.APPS.CAMPUS_CURRENT.ROOT) ||
            (tab.path !== ROUTES.APPS.CAMPUS_CURRENT.ROOT &&
              currentPath.startsWith(tab.path));
          return (
            <li key={tab.name}>
              <Link
                to={tab.path}
                className={cn(
                  "flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                {tab.icon}
                {tab.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
