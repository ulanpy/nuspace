"use client"

import type React from "react"

import { useLocation, Link } from "react-router-dom"
import { cn } from "../../utils/utils"

interface Tab {
  label: string
  path: string
  icon?: React.ReactNode
}

interface NavTabsProps {
  tabs: Tab[]
}

export const NavTabs = ({ tabs }: NavTabsProps) => {
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <div className="flex border-b overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive =
          (tab.path === "/apps/nu-events" && currentPath === "/apps/nu-events") ||
          (tab.path !== "/apps/nu-events" && currentPath.startsWith(tab.path))

        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={cn(
              "flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {tab.icon}
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
