"use client";

import { Outlet } from "react-router-dom";
import { IconThemeToggle } from "@/components/atoms/icon-theme-toggle";

export function PublicLayout() {
    return (
        <div className="min-h-screen bg-background flex flex-col relative">
            <div className="fixed top-4 left-4 z-50">
                <IconThemeToggle className="h-12 w-12" size={24} />
            </div>
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
}

export default PublicLayout;
