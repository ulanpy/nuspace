"use client";

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "@/hooks/use-user";
import { ROUTES } from "@/data/routes";

interface LocationState {
    from?: string;
}


export function PublicRoute() {
    const { user, isLoading, isSuccess, isError } = useUser();
    const location = useLocation();
    const state = location.state as LocationState | null;


    // If authenticated, redirect to original destination or Announcements
    if (isSuccess && !isError && user) {
        const redirectTo = state?.from || ROUTES.ANNOUNCEMENTS;
        return <Navigate to={redirectTo} replace />;
    }

    // User is not authenticated, render the public content
    return <Outlet />;
}

export default PublicRoute;
