"use client";

import { Outlet } from "react-router-dom";
import { useUser } from "@/hooks/use-user";

export function ProtectedRoute() {
    const { isLoading } = useUser();

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

    // User is authenticated (or guest), render the protected content
    return <Outlet />;
}

export default ProtectedRoute;
