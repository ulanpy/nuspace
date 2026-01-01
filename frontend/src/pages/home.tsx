"use client";

import { AppGrid } from "../components/organisms/app-grid";
import { LoginButton } from "../components/molecules/buttons/login-button";
import { GlowCarouselWithImage } from "../components/organisms/glow-carousel-with-images";
import { useUser } from "@/hooks/use-user";
import { ReportButton } from "@/components/molecules/buttons/report-button";
import { DonateButton } from "@/components/molecules/buttons/donate-button";
import { ChannelButton } from "@/components/molecules/buttons/channel-button";
import { TelegramStatus } from "@/components/molecules/telegram-status";
import { BindTelegramButton } from "@/components/molecules/buttons/bind-telegram-button";
import welcomeNuSpace from "@/assets/images/welcome-nu-space.jpg";
import miniapp from "@/assets/images/miniapp-resized.webp";
import { FlaskConical } from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Link as LinkIcon } from "lucide-react";
import { Header } from "@/components/atoms/header";
import { LastCommitInline } from "@/components/molecules/last-commit";
import { useMemo } from "react";
import { useEvents } from "@/features/events/hooks/useEvents";
import { Link } from "react-router-dom";
import { ROUTES } from "@/data/routes";
import { ThemeToggle } from "@/components/molecules/theme-toggle";
import { SnowToggle } from "@/components/molecules/snow-toggle";

// Static slides reused below when composing the final carousel list
const staticSlides = [
  {
    id: "miniapp",
    content: (
      <a
        href="https://t.me/NUspaceBot/app"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full h-full block cursor-pointer hover:opacity-90 transition-opacity"
      >
        <img
          src={miniapp}
          alt="NUspace Telegram Mini App"
          className="w-full h-full object-cover rounded-xl"
          loading="eager"
          decoding="async"
        />
      </a>
    ),
    gradient:
      "radial-gradient(circle, rgba(0,122,255,0.15) 0%, rgba(0,122,255,0.06) 50%, rgba(0,122,255,0) 100%)",
    accentColor: "rgb(0 122 255)",
  },
  {
    id: "welcome",
    content: (
      <div className="w-full h-full flex items-center justify-center">
        <img
          src={welcomeNuSpace}
          alt="Featured image"
          className="w-full h-full object-cover rounded-xl"
          loading="lazy"
          decoding="async"
        />
      </div>
    ),
    gradient:
      "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
    accentColor: "rgb(59 130 246)",
  },
];

export default function HomePage() {
  const { user, isLoading, isSuccess } = useUser();
  // Fetch first upcoming event for the leading carousel item
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { events: eventsData } = useEvents({ start_date: todayStr, size: 1 });

  const eventSlide = useMemo(() => {
    const e = eventsData?.items?.[0];
    if (!e) return null;
    const poster = e.media?.[0]?.url || "/placeholder.svg";
    const dateStr = new Date(e.start_datetime).toLocaleDateString();
    const hostName =
      e.scope === "community"
        ? e.community?.name || ""
        : `${e.creator?.name || ""} ${e.creator?.surname || ""}`;

    return {
      id: `event-${e.id}`,
      content: (
        <Link
          to={ROUTES.EVENTS.DETAIL_FN(String(e.id))}
          className="block w-full h-full"
          data-full-bleed
        >
          <div className="relative w-full h-full bg-black/10 rounded-xl overflow-hidden">
            <div className="flex h-full">
              <div className="w-1/2 relative">
                <img src={poster} alt={e.name} className="w-full h-full object-cover" />
              </div>
              <div className="w-1/2 p-4 md:p-6 flex flex-col justify-center text-white bg-black/20 gap-2">
                <h3 className="text-lg md:text-xl font-semibold line-clamp-2">{e.name}</h3>
                <div className="flex items-center text-sm">
                  <span className="mr-2">📅</span>
                  <span>{dateStr}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="mr-2">📍</span>
                  <span className="truncate">{e.place}</span>
                </div>
                {hostName && (
                  <div className="mt-1 text-xs md:text-sm opacity-80">by {hostName}</div>
                )}
              </div>
            </div>
          </div>
        </Link>
      ),
      gradient:
        "radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(124,58,237,0.06) 50%, rgba(109,40,217,0) 100%)",
      accentColor: "rgb(139 92 246)",
    };
  }, [eventsData]);

  const homeCarouselItems = useMemo(() => {
    return eventSlide ? [eventSlide, ...staticSlides] : staticSlides;
  }, [eventSlide]);
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with main navigation */}
      <Header
        right={
          <div className="flex gap-2">
            <ThemeToggle />
            <SnowToggle />
            <LoginButton />
          </div>
        }
        showMainNav
      />
      <div className="flex-1 w-full overflow-y-auto p-3 sm:p-4 pb-[calc(56px+env(safe-area-inset-bottom))]">
        {/* Beta banner - visible on all viewports with last commit inline */}
        <div className="w-full mb-6">
          <div className="w-full rounded-lg border border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100 px-3 py-2 sm:px-4 sm:py-3">
            <div className="w-full flex flex-col gap-2 sm:gap-3">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <FlaskConical className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 sm:mt-0" />
                <p className="text-xs sm:text-sm leading-snug">
                  <span className="font-semibold">Public Beta.</span> We're actively improving Nuspace and truly value your feedback.
                </p>
              </div>
              
              {/* 
                Mobile-first responsive layout: 
                - On mobile: commit info and buttons stack vertically for better readability
                - On larger screens: commit info and buttons are side-by-side
                - Commit info takes available space, buttons maintain their natural width
              */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                {/* Commit info - takes full width on mobile, flex-1 on larger screens */}
                <div className="flex-1 min-w-0">
                  <LastCommitInline />
                </div>
                
                {/* Action buttons - full width on mobile, auto width on larger screens */}
                <div className="flex gap-2 sm:flex-shrink-0">
                  <DonateButton />
                  <ChannelButton />
                  <ReportButton />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center pb-[calc(96px+env(safe-area-inset-bottom))]">
          {/* Greeting */}
          <div className="text-center mb-[clamp(0px,3vw,24px)]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            {isLoading ? (
              <span>Loading...</span>
            ) : isSuccess && user?.given_name ? (
              <div className="flex items-center gap-3 justify-center">
                <img
                  src={user.picture}
                  alt=""
                  className="rounded-full w-[clamp(32px,6vw,48px)] h-[clamp(32px,6vw,48px)]"
                />
                <span className="text-[clamp(24px,5vw,42px)] font-bold">
                  Welcome back, {user.given_name}!
                </span>
                {/* Mobile-only compact Telegram status */}
                <div className="sm:hidden">
                  {user.tg_id ? (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30" title="Telegram Connected">
                      <FaTelegram className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        // Directly trigger the desktop BindTelegramButton
                        const desktopButton = document.querySelector('[data-bind-telegram] button') as HTMLButtonElement;
                        if (desktopButton) {
                          desktopButton.click();
                        }
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors border border-blue-200 dark:border-blue-800"
                      title="Connect Telegram"
                    >
                      <div className="flex items-center gap-0.5">
                        <LinkIcon className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                        <FaTelegram className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <span>Welcome to Nuspace</span>
            )}
          </h1>
          {/* Desktop-only Telegram status below greeting */}
          {isSuccess && user?.given_name && (
            <div className="hidden sm:flex justify-center mt-1">
              {user.tg_id ? (
                <TelegramStatus isConnected={true} />
              ) : (
                <div data-bind-telegram>
                  <BindTelegramButton />
                </div>
              )}
            </div>
          )}
          </div>

          {/* Carousel - properly positioned */}
          <div className="w-full max-w-3xl mb-12">
            <GlowCarouselWithImage items={homeCarouselItems} />
          </div>

          <div className="flex flex-col items-center gap-8 sm:gap-12 w-full">
            <AppGrid />
          </div>
        </div>
      </div>
      
      {/* Contacts info lives on its own page reachable from AppGrid */}
    </div>
  );
}
