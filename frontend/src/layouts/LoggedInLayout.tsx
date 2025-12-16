"use client";

import { Outlet } from "react-router-dom";
import { MediaUploadProvider } from "@/context/MediaUploadContext";
import { MediaEditProvider } from "@/context/MediaEditContext";
import { BackNavigationProvider } from "@/context/BackNavigationContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toasts } from "@/components/atoms/toast";

export function LoggedInLayout() {
    return (
        <MediaUploadProvider>
            <MediaEditProvider>
                <BackNavigationProvider>
                    <div className="min-h-screen bg-background">
                        {/* Sidebar component handles both desktop fixed sidebar and mobile hamburger/sheet */}
                        <Sidebar />

                        {/* Main content area with left margin on desktop to account for sidebar */}
                        <main className="min-h-screen ml-0 sidebar-margin pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
                            <div className="container py-4 sm:py-6 px-3 sm:px-4">
                                <Outlet />
                            </div>
                        </main>

                        {/* Toast notifications */}
                        <Toasts />
                    </div>
                </BackNavigationProvider>
            </MediaEditProvider>
        </MediaUploadProvider>
    );
}

export default LoggedInLayout;
