"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Megaphone,
    Calendar,
    BookOpen,
    Users,
    Info,
    Shield,
    Briefcase,
    Menu,
    LogOut,
    LogIn,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import NuspaceLogoIcon from "@/assets/svg/nuspace_logo.svg";
import { ROUTES } from "@/data/routes";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/atoms/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/atoms/sheet";
import { cn } from "@/utils/utils";

// localStorage key for sidebar collapsed state
const SIDEBAR_COLLAPSED_KEY = "__nuspace_sidebar_collapsed__";

interface NavItem {
    to: string;
    label: string;
    icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
    { to: ROUTES.ANNOUNCEMENTS, label: "Announcements", icon: <Megaphone size={20} /> },
    { to: ROUTES.EVENTS.ROOT, label: "Events", icon: <Calendar size={20} /> },
    { to: ROUTES.COURSES, label: "Courses", icon: <BookOpen size={20} /> },
    { to: ROUTES.COMMUNITIES.ROOT, label: "Communities", icon: <Users size={20} /> },
    { to: ROUTES.OPPORTUNITIES.ROOT, label: "Opportunities Digest", icon: <Briefcase size={20} /> },
    { to: ROUTES.CONTACTS, label: "Contacts", icon: <Info size={20} /> },
    { to: ROUTES.SGOTINISH.ROOT, label: "Sgotinish", icon: <Shield size={20} /> },
];

interface NuspaceLogoProps {
    collapsed?: boolean;
}

import { IconThemeToggle } from "@/components/atoms/icon-theme-toggle";
import { SnowToggle } from "@/components/molecules/snow-toggle";

function NuspaceLogo({ collapsed = false }: NuspaceLogoProps) {
    if (collapsed) return null;

    // In Next.js, imported SVGs return an object with src property
    const logoSrc = typeof NuspaceLogoIcon === 'string' 
        ? NuspaceLogoIcon 
        : (NuspaceLogoIcon as { src: string }).src;

    return (
        <div className="flex items-center gap-2">
            <img
                src={logoSrc}
                alt="Nuspace Logo"
                className="w-7 h-7 object-contain"
            />
            <span className="font-bold text-xl whitespace-nowrap">Nuspace</span>
        </div>
    );
}


interface SidebarNavProps {
    onNavigate?: () => void;
    collapsed?: boolean;
}

function SidebarNav({ onNavigate, collapsed = false }: SidebarNavProps) {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === ROUTES.ANNOUNCEMENTS) {
            return pathname === path;
        }
        return pathname.startsWith(path);
    };

    return (
        <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
                <Link
                    key={item.to}
                    href={item.to}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                        "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                        collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                        isActive(item.to)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                </Link>
            ))}
        </nav>
    );
}

interface SidebarUserFooterProps {
    collapsed?: boolean;
}

function SidebarUserFooter({ collapsed = false }: SidebarUserFooterProps) {
    const { user, logout, login, isLoggingOut } = useUser();

    const displayUser = user || {
        given_name: "Guest",
        family_name: "",
        email: "Guest",
        picture: null
    };

    const handleAuthAction = user ? logout : login;
    const authActionLabel = user ? (isLoggingOut ? "Logging out..." : "Logout") : "Login";
    const AuthIcon = user ? LogOut : LogIn;

    if (collapsed) {
        return (
            <div className="border-t pt-4 mt-auto flex flex-col items-center gap-2">
                {displayUser.picture ? (
                    <img
                        src={displayUser.picture}
                        alt={displayUser.given_name || "User"}
                        className="w-10 h-10 rounded-full"
                        title={`${displayUser.given_name} ${displayUser.family_name || ""}`}
                    />
                ) : (
                    <div
                        className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
                        title={`${displayUser.given_name} ${displayUser.family_name || ""}`}
                    >
                        <span className="text-primary font-semibold text-sm">
                            {(displayUser.given_name?.[0] || "U").toUpperCase()}
                        </span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-destructive"
                    onClick={handleAuthAction}
                    disabled={isLoggingOut}
                    title={authActionLabel}
                >
                    <AuthIcon size={18} />
                </Button>
            </div>
        );
    }

    return (
        <div className="border-t pt-4 mt-auto">
            <div className="flex items-center gap-3 px-2 mb-3">
                {displayUser.picture ? (
                    <img
                        src={displayUser.picture}
                        alt={displayUser.given_name || "User"}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold">
                            {(displayUser.given_name?.[0] || "U").toUpperCase()}
                        </span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                        {displayUser.given_name} {displayUser.family_name || ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                        {displayUser.email || "NU Student"}
                    </p>
                </div>
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
                onClick={handleAuthAction}
                disabled={isLoggingOut}
            >
                <AuthIcon size={18} />
                {authActionLabel}
            </Button>
        </div>
    );
}

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Load collapsed state from localStorage after mount to avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (stored === "true") {
            setIsCollapsed(true);
        }
    }, []);

    // Persist collapsed state
    useEffect(() => {
        if (mounted) {
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
        }
    }, [isCollapsed, mounted]);

    const handleNavigate = () => {
        setIsOpen(false);
    };

    const toggleCollapsed = () => {
        setIsCollapsed((prev) => !prev);
    };

    // Dynamic widths
    const sidebarWidth = isCollapsed ? "w-16" : "w-64";

    return (
        <>
            {/* Mobile hamburger button */}
            <div className="md:hidden fixed top-0 left-0 z-50 p-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}>
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10">
                            <Menu size={24} />
                            <span className="sr-only">Open navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 p-0" hideClose>
                        <div className="flex flex-col h-full p-6">
                            <SheetHeader className="mb-6">
                                <SheetTitle className="flex items-center justify-between gap-3">
                                    <NuspaceLogo />
                                    <div className="flex items-center gap-2 shrink-0">
                                        <IconThemeToggle />
                                        <SnowToggle />
                                    </div>
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto">
                                <SidebarNav onNavigate={handleNavigate} />
                            </div>
                            <SidebarUserFooter />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop sidebar */}
            <aside
                className={cn(
                    "hidden md:flex fixed left-0 top-0 h-screen border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex-col z-40 transition-all duration-300 ease-in-out",
                    sidebarWidth
                )}
            >
                {/* Header with logo and theme toggle */}
                <div className={cn("border-b flex items-center justify-between p-6")}>
                    <NuspaceLogo collapsed={isCollapsed} />
                    <div className="flex items-center gap-2 shrink-0">
                        <IconThemeToggle collapsed={isCollapsed} />
                        {!isCollapsed && <SnowToggle />}
                    </div>
                </div>

                {/* Nav items */}
                <div className={cn("flex-1 overflow-y-auto overflow-x-hidden p-2")}>
                    <SidebarNav collapsed={isCollapsed} />
                </div>

                {/* User footer */}
                <div className={cn("p-4")}>
                    <SidebarUserFooter collapsed={isCollapsed} />
                </div>

                {/* Collapse toggle button */}
                <button
                    onClick={toggleCollapsed}
                    className="absolute -right-3 top-1/2 z-50 hidden h-10 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md transition-all hover:w-8 hover:bg-muted md:flex group"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <div className="text-secondary-foreground/70 transition-transform duration-300 group-hover:scale-125 group-hover:text-foreground">
                        {isCollapsed ? (
                            <ChevronRight size={14} strokeWidth={2.5} />
                        ) : (
                            <ChevronLeft size={14} strokeWidth={2.5} />
                        )}
                    </div>
                </button>
            </aside>

            {/* CSS variable for main content margin */}
            <style>{`
                .sidebar-margin {
                    margin-left: 0;
                }
                @media (min-width: 768px) {
                    .sidebar-margin {
                        margin-left: ${isCollapsed ? "4rem" : "16rem"};
                        transition: margin-left 0.3s ease-in-out;
                    }
                }
            `}</style>
        </>
    );
}

// Export the collapsed state hook for LoggedInLayout to use
export function useSidebarCollapsed() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
    }, []);

    useEffect(() => {
        if (!mounted) return;
        
        const handleStorageChange = () => {
            setIsCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
        };

        window.addEventListener("storage", handleStorageChange);

        // Also listen for custom event for same-tab updates
        const interval = setInterval(() => {
            const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
            if (stored !== isCollapsed) {
                setIsCollapsed(stored);
            }
        }, 100);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            clearInterval(interval);
        };
    }, [isCollapsed, mounted]);

    return isCollapsed;
}

export default Sidebar;
