import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { PiHouse, PiHouseFill, PiUserCircle, PiUserCircleFill, PiChatCircle, PiChatCircleFill } from "react-icons/pi";
import { ROUTES } from "@/data/routes";
import { useTelegramMiniApp } from "@/hooks/useTelegramMiniApp";

interface BottomNavItem {
  to: string;
  label: string;
  icon: "home" | "profile" | "subspace";
}

function buildNavItems(): BottomNavItem[] {
  return [
    { to: ROUTES.HOME, label: "Home", icon: "home" },
    { to: ROUTES.APPS.CAMPUS_CURRENT.POSTS, label: "Subspace", icon: "subspace" },
    { to: ROUTES.APPS.PROFILE, label: "Profile", icon: "profile" },
  ];
}

export function MobileBottomNav() {
  const { isMiniApp, platform } = useTelegramMiniApp();
  const responsiveVisibility = isMiniApp ? "" : "md:hidden";
  const baseIconSize = isMiniApp ? 44 : 20;
  const baseNavHeight = isMiniApp ? 84 : 56;
  const baseLabelFont = isMiniApp ? 13 : 12;

  const [iconSize, setIconSize] = useState<number>(baseIconSize);
  const [navHeight, setNavHeight] = useState<number>(baseNavHeight);
  const [labelFontPx, setLabelFontPx] = useState<number>(baseLabelFont);
  const labelTextClass = isMiniApp ? "font-medium tracking-tight" : "text-xs";

  useEffect(() => {
    if (!isMiniApp) return;
    const computeSizes = () => {
      const width = Math.max(320, Math.min(window.innerWidth || 375, 540));
      const baseWidth = 375; // iPhone X baseline
      const factor = Math.max(0.9, Math.min(width / baseWidth, 1.35));
      const baseIcon = platform === "android" ? 46 : 40;
      const computedIcon = Math.round(
        Math.max(36, Math.min(56, baseIcon * factor)),
      );
      const baseNav = platform === "android" ? 92 : 84;
      const computedNav = Math.round(
        Math.max(76, Math.min(104, baseNav * factor)),
      );
      const baseLabel = platform === "android" ? 13.5 : 13;
      const computedLabel = Math.round(
        Math.max(12, Math.min(14, baseLabel * factor)),
      );
      setIconSize(computedIcon);
      setNavHeight(computedNav);
      setLabelFontPx(computedLabel);
    };
    computeSizes();
    const onResize = () => computeSizes();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [isMiniApp, platform]);

  const NAV_ITEMS = buildNavItems();

  const navHeightPx = `${navHeight}px`;
  const navTotalHeight = `calc(${navHeightPx} + env(safe-area-inset-bottom, 0px))`;

  return (
    <nav
      className={`mobile-bottom-nav fixed bottom-0 inset-x-0 z-50 ${isMiniApp ? "border-t-2" : "border-t"} bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm ${responsiveVisibility}`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: navTotalHeight,
        minHeight: navHeightPx,
      }}
    >
      <ul
        className={`flex items-stretch justify-around h-full px-2 ${isMiniApp ? "pt-1" : ""}`}
        style={{ height: navHeightPx }}
      >
        {NAV_ITEMS.map((item) => {
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === ROUTES.HOME}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 h-full ${labelTextClass} ` +
                  (isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")
                }
              >
                {({ isActive }) => (
                  <>
                    {(() => {
                      switch (item.icon) {
                        case "home":
                          return isActive ? <PiHouseFill size={iconSize} /> : <PiHouse size={iconSize} />;
                        case "profile":
                          return isActive ? <PiUserCircleFill size={iconSize} /> : <PiUserCircle size={iconSize} />;
                        case "subspace":
                          return isActive ? <PiChatCircleFill size={iconSize} /> : <PiChatCircle size={iconSize} />;
                        default:
                          return null;
                      }
                    })()}
                    <span style={isMiniApp ? { fontSize: `${labelFontPx}px`, lineHeight: 1.1 } : undefined}>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


