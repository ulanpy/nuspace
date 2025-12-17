"use client";

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "@/hooks/use-user";
import { ROUTES } from "@/data/routes";

interface LocationState {
    from?: string;
}


export function PublicRoute() {
    const { user, isLoading, isFetching, isSuccess, isError } = useUser();
    const location = useLocation();
    const state = location.state as LocationState | null;


    // Avoid flashing the landing page while auth status is loading
    if (isLoading || isFetching) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // If authenticated, redirect to original destination or Announcements
    if (isSuccess && !isError && user) {
        const redirectTo = state?.from || ROUTES.ANNOUNCEMENTS;
        return <Navigate to={redirectTo} replace />;
    }

    // User is not authenticated, render the public content
    return <Outlet />;
}

export default PublicRoute;
