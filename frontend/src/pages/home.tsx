"use client";

import { ThemeToggle } from "../components/molecules/theme-toggle";
import { AppGrid } from "../components/organisms/app-grid";
import { LoginButton } from "../components/molecules/buttons/login-button";
import { GlowCarouselWithImage } from "../components/organisms/glow-carousel-with-images";
import { useUser } from "@/hooks/use-user";
import { ReportButton } from "@/components/molecules/buttons/report-button";
import { TelegramStatus } from "@/components/molecules/telegram-status";
import { BindTelegramButton } from "@/components/molecules/buttons/bind-telegram-button";
import Footer from "@/components/ui/footer";
import nuSpacePresentation from "@/assets/images/nu-space-presentation.jpg";
import welcomeNuSpace from "@/assets/images/welcome-nu-space.jpg";
import { FlaskConical } from "lucide-react";
import { Header } from "@/components/atoms/header";

const homeCarouselItems = [
  {
    id: 1,
    content: (
      <div className="w-full h-full flex items-center justify-center">
        <img
          src={nuSpacePresentation}
          alt="Featured image"
          className="w-full h-full object-cover rounded-xl"
          loading="eager"
          decoding="async"
        />
      </div>
    ),
    gradient:
      "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.06) 50%, rgba(194,65,12,0) 100%)",
    accentColor: "rgb(249 115 22)",
  },
  {
    id: 2,
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
  return (
    <div className="min-h-screen bg-background flex flex-col p-3 sm:p-4">
      {/* Header with login button */}
      <Header
            right={
              <div className="flex gap-4">
                <ThemeToggle />
                <LoginButton />
              </div>
            }
          ></Header>
      {/* Beta banner - visible on all viewports */}
      <div className="w-full mb-6">
        <div className="w-full rounded-lg border border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100 px-3 py-2 sm:px-4 sm:py-3">
          <div className="w-full flex items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              <FlaskConical className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 sm:mt-0" />
              <p className="text-xs sm:text-sm leading-snug">
                <span className="font-semibold">Public Beta.</span> We’re actively improving Nuspace and truly value your feedback.
              </p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <ReportButton />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center">
        {/* Greeting */}
        <div className="text-center mb-[clamp(0px,4vw,32px)]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            {isLoading ? (
              <span>Loading...</span>
            ) : isSuccess && user?.user.given_name ? (
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <img
                  src={user.user.picture}
                  alt=""
                  className="rounded-full w-[clamp(32px,6vw,48px)] h-[clamp(32px,6vw,48px)]"
                />
                <span className="text-[clamp(24px,5vw,42px)] font-bold">
                  Welcome back, {user.user.given_name}!
                </span>
                {user.tg_id ? (
                  <TelegramStatus isConnected={true} />
                ) : (
                  <BindTelegramButton />
                )}
              </div>
            ) : (
              <span>Welcome to NU Space</span>
            )}
          </h1>
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
  );
}
