import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { PiUserCircle, PiUserCircleFill, PiChatCircle, PiChatCircleFill } from "react-icons/pi";
import { ROUTES } from "@/data/routes";
import { useTelegramMiniApp } from "@/hooks/useTelegramMiniApp";

function NuSpaceLogoIcon({ size, isActive }: { size: number; isActive: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 285 302"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: isActive ? 1 : 0.6, transition: "opacity 0.2s ease" }}
      aria-hidden="true"
    >
      <path
        d="M81.9095 133.174C82.5155 143.134 82.2035 156.839 82.2295 167.04L82.1895 233.472L82.2195 272.945C82.2255 279.712 82.4595 286.575 81.8905 293.308C81.5375 297.487 76.4945 300.815 72.6105 300.999C66.1265 301.308 59.4455 301.06 52.9145 301.068L28.4065 301.101C23.8125 301.107 19.2375 301.157 14.6295 301.039C10.7415 301.104 7.10855 298.977 4.59155 296.073C-1.28445 289.294 0.229534 276.814 0.238534 268.365L0.263543 239.049L0.235543 148.577L0.53254 60.2232C0.51054 56.2982 0.130535 52.3442 0.111535 48.4162C0.0445347 35.0173 -0.106463 21.6002 0.120537 8.20424C-0.0064626 6.71624 1.11755 3.30225 2.66254 2.57125C6.48954 0.759246 15.4185 1.36123 19.6065 1.35823L42.3775 1.33625L61.8115 1.29724C87.0945 1.27024 88.1485 4.18524 102.595 24.3702L118.358 46.4092C130.803 63.8082 144.635 81.8063 156.595 99.2233C159.804 103.278 161.965 106.76 164.708 111.128C162.04 116.832 161.052 122.565 159.293 128.567C153.712 147.606 148.302 166.806 143.339 186.009C141.921 191.497 138.021 200.713 137.539 206.001C137.35 207.485 137.251 208.057 136.825 209.485C133.722 205.805 130.885 201.724 128.155 197.765L102.393 161.901C95.5015 152.266 88.9575 142.767 81.9095 133.174Z"
        fill="currentColor"
      />
      <path
        d="M156.595 99.2236C159.804 103.279 161.965 106.761 164.708 111.129C162.04 116.833 161.052 122.566 159.293 128.568C153.712 147.607 148.302 166.807 143.339 186.01C141.921 191.498 138.021 200.714 137.539 206.002C137.35 207.486 137.251 208.058 136.825 209.486C133.722 205.806 130.885 201.725 128.155 197.766C129.225 196.7 129.414 196.543 129.75 195.114C129.63 193.969 134.775 177.08 135.464 174.634L150.016 121.962C151.591 116.287 154.45 104.145 156.595 99.2236Z"
        fill="currentColor"
      />
      <path
        d="M129.75 195.113C131.639 197.609 133.478 200.123 135.319 202.651C135.943 203.509 137.036 205.464 137.539 206.001C137.35 207.485 137.251 208.057 136.825 209.485C133.722 205.805 130.885 201.724 128.155 197.765C129.225 196.699 129.414 196.542 129.75 195.113Z"
        fill="currentColor"
      />
      <path
        d="M201.992 162.578C202.422 161.743 201.999 104.537 201.967 98.7718L201.936 46.3838L201.911 24.9388C201.895 20.6018 201.164 11.0638 202.422 7.11477C203.167 4.77577 205.793 2.70077 207.86 1.56977C209.171 0.851768 210.47 0.486758 211.957 0.365758C221.279 -0.393242 231.097 0.260758 240.469 0.283758C246.953 0.299758 271.459 -0.547241 276.101 0.947759C278.718 1.79076 281.12 3.68976 282.35 6.17376C283.815 9.13276 283.728 13.4548 283.789 16.6988C283.953 25.4238 283.727 34.1498 283.782 42.8758C284.075 90.2148 283.341 137.564 283.831 184.897C283.907 192.188 284.692 199.454 284.818 206.741C285.148 225.743 284.904 244.834 284.889 263.844L284.831 283.128C284.824 285.965 284.995 290.566 284.715 293.255C284.809 294.48 284.751 295.711 284.542 296.921C284.046 299.838 281.48 301 278.78 301.032C271.47 301.12 264.125 301.061 256.815 301.066L229.977 301.073C216.87 301.07 202.825 302.789 194.547 289.975C192.485 286.782 190.108 283.398 187.882 280.304C179.479 268.733 171.167 257.097 162.944 245.398L145.944 221.899C143.627 218.759 138.53 212.472 136.825 209.486C137.251 208.058 137.35 207.486 137.539 206.002C138.021 200.714 141.921 191.498 143.339 186.01C148.302 166.807 153.712 147.607 159.293 128.568C161.052 122.566 162.04 116.833 164.708 111.129C169.39 116.651 173.038 122.346 177.321 128.112C185.726 139.427 193.406 151.432 201.992 162.578Z"
        fill="currentColor"
      />
      <path
        d="M164.708 111.129C169.39 116.651 173.038 122.346 177.321 128.112C185.726 139.427 193.406 151.432 201.992 162.578C202.488 163.903 210.315 175.737 211.564 177.668L232.008 209.789C235.329 215.059 238.327 220.815 241.72 225.978C251.736 241.22 260.735 257.137 270.563 272.471C274.456 278.544 279.423 287.896 284.242 292.776L284.536 293.077C284.596 293.136 284.655 293.196 284.715 293.255C284.809 294.48 284.751 295.711 284.542 296.921C284.046 299.838 281.48 301 278.78 301.032C271.47 301.12 264.125 301.061 256.815 301.066L229.977 301.073C216.87 301.07 202.825 302.789 194.547 289.975C192.485 286.782 190.108 283.398 187.882 280.304C179.479 268.733 171.167 257.097 162.944 245.398L145.944 221.899C143.627 218.759 138.53 212.472 136.825 209.486C137.251 208.058 137.35 207.486 137.539 206.002C138.021 200.714 141.921 191.498 143.339 186.01C148.302 166.807 153.712 147.607 159.293 128.568C161.052 122.566 162.04 116.833 164.708 111.129Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
  const baseIconSize = isMiniApp ? 24 : 20;
  const baseNavHeight = 48;
  const baseLabelFont = isMiniApp ? 11 : 12;

  const [iconSize, setIconSize] = useState<number>(baseIconSize);
  const [navHeight, setNavHeight] = useState<number>(baseNavHeight);
  const [labelFontPx, setLabelFontPx] = useState<number>(baseLabelFont);
  const labelTextClass = isMiniApp ? "font-medium tracking-tight" : "text-xs";

  useEffect(() => {
    if (!isMiniApp) return;
    const computeSizes = () => {
      const width = Math.max(320, Math.min(window.innerWidth || 375, 540));
      const baseWidth = 375; // iPhone X baseline
      const factor = Math.max(0.9, Math.min(width / baseWidth, 1.05));
      const baseIcon = 24;
      const computedIcon = Math.round(
        Math.max(22, Math.min(30, baseIcon * factor)),
      );
      const baseNav = 48;
      const computedNav = Math.round(
        Math.max(46, Math.min(52, baseNav * factor)),
      );
      const baseLabel = 11;
      const computedLabel = Math.round(
        Math.max(10, Math.min(11, baseLabel * factor)),
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
                          return <NuSpaceLogoIcon size={Math.round(iconSize * 0.8)} isActive={isActive} />;
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


