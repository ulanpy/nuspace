"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PiUserCircle, PiUserCircleFill } from "react-icons/pi";
import { ROUTES } from "@/data/routes";
import { useState, useEffect } from "react";

interface HeaderProps {
  left?: JSX.Element;
  center?: JSX.Element;
  right?: JSX.Element;
  showMainNav?: boolean;
}

export function Header({ left, center, right, showMainNav = false }: HeaderProps) {
  const pathname = usePathname();
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);
  
  // Check if we're in a mobile browser (not just mini app)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileBrowser(window.innerWidth <= 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Hide Profile from header when in mobile browser since it lives in the mobile bottom navbar
  const shouldShowNavItems = !isMobileBrowser;
  
  const mainNavItems = shouldShowNavItems
    ? [{ to: ROUTES.PROFILE, icon: "profile" }]
    : [];

  const renderIcon = (icon: string, isActive: boolean, size: number = 20) => {
    switch (icon) {
      case "profile":
        return isActive ? <PiUserCircleFill size={size} /> : <PiUserCircle size={size} />;
      default:
        return null;
    }
  };

  return (
    <header
      className="w-full sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
    >
      <div className="flex justify-between items-center px-4 py-2">
        <div>{left}</div>
        <div>{center}</div>
        <div className="flex items-center gap-4">
          {shouldShowNavItems && showMainNav && mainNavItems.length > 0 && (
            <nav className="flex items-center gap-5">
              {mainNavItems.map((item) => {
                const isActive = item.to === ROUTES.HOME 
                  ? pathname === item.to 
                  : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    className={`flex items-center gap-2 text-base font-medium transition-colors text-foreground ` +
                      (isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {renderIcon(item.icon, isActive, 23)}
                  </Link>
                );
              })}
            </nav>
          )}
          {right}
        </div>
      </div>
    </header>
  );
}