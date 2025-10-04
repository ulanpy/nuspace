import { NavLink } from "react-router-dom";
import { PiUserCircle, PiUserCircleFill, PiChatCircle, PiChatCircleFill } from "react-icons/pi";
import { ROUTES } from "@/data/routes";
import { useTelegramMiniApp } from "@/hooks/useTelegramMiniApp";
import { useState, useEffect } from "react";

interface HeaderProps {
    left?: JSX.Element;   
    center?: JSX.Element; 
    right?: JSX.Element;
    showMainNav?: boolean;
}

export function Header({ left, center, right, showMainNav = false }: HeaderProps) {
  const { isMiniApp } = useTelegramMiniApp();
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
  
  // Hide Profile and Subspace from header when in mobile browser or mini app
  // since they are available in the mobile bottom navbar
  const shouldShowNavItems = !isMiniApp && !isMobileBrowser;
  
  const mainNavItems = shouldShowNavItems ? [
    { to: ROUTES.APPS.CAMPUS_CURRENT.POSTS, icon: "subspace" },
    { to: ROUTES.APPS.PROFILE, icon: "profile" },
  ] : [];

  const renderIcon = (icon: string, isActive: boolean, size: number = 20) => {
    switch (icon) {
      case "profile":
        return isActive ? <PiUserCircleFill size={size} /> : <PiUserCircle size={size} />;
      case "subspace":
        return isActive ? <PiChatCircleFill size={size} /> : <PiChatCircle size={size} />;
      default:
        return null;
    }
  };

  return (
    <header
      className="w-full sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg safe-area-inset-top"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + var(--tg-header-offset, 0px))" }}
    >
      <div className="flex justify-between items-center px-4 py-2">
        <div>{left}</div>
        <div>{center}</div>
        <div className="flex items-center gap-4">
          {shouldShowNavItems && showMainNav && mainNavItems.length > 0 && (
            <nav className="flex items-center gap-5">
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === ROUTES.HOME}
                  className={({ isActive }) =>
                    `flex items-center gap-2 text-base font-medium transition-colors text-foreground ` +
                    (isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {({ isActive }) => (
                    <>
                      {renderIcon(item.icon, isActive, 23)}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          )}
          {right}
        </div>
      </div>
    </header>
  );
}