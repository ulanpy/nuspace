"use client";

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "@/hooks/use-user";
import { ROUTES } from "@/data/routes";

export function ProtectedRoute() {
    const { user, isLoading, isSuccess } = useUser();
    const location = useLocation();

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to landing page if not authenticated, preserving intended destination
    if (!isSuccess || !user) {
        // Save the intended destination to sessionStorage (survives OAuth redirect)
        const intendedUrl = location.pathname + location.search + location.hash;
        if (intendedUrl !== "/" && intendedUrl !== ROUTES.ANNOUNCEMENTS) {
            sessionStorage.setItem("__nuspace_redirect_url__", intendedUrl);
        }

        return <Navigate to={ROUTES.HOME} replace />;
    }

    // User is authenticated, render the protected content
    return <Outlet />;
}

export default ProtectedRoute;
