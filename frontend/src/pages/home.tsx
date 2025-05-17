"use client";

import { ThemeToggle } from "../components/molecules/theme-toggle";
import { AppGrid } from "../components/organisms/app-grid";
import { LoginButton } from "../components/molecules/buttons/login-button";
import { GlowCarouselWithImage } from "../components/organisms/glow-carousel-with-images";
import { Link } from "react-router-dom";
import { useUser } from "@/hooks/use-user";
import { ReportButton } from "@/components/molecules/buttons/report-button";
// Define carousel items with your image for the homepage

const homeCarouselItems = [
  {
    id: 1,
    content: (
      <div className="w-full h-full flex items-center justify-center">
        <img
          src="/images/nu-space-presentation.jpg"
          alt="Featured image"
          className="w-full h-full object-cover rounded-xl"
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
          src="/images/welcome-nu-space.jpg"
          alt="Featured image"
          className="w-full h-full object-cover rounded-xl"
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
      <header className="w-full flex justify-between items-center mb-8">
        <div className="flex items-center gap-6">
          <ThemeToggle />
          <ReportButton />
        </div>
        <LoginButton />
      </header>

      <div className="flex-1 flex flex-col items-center">
        {/* Greeting */}
        <div className="text-center mb-[clamp(0px,4vw,32px)]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            {isLoading ? (
              <span>Loading...</span>
            ) : isSuccess && user?.user.given_name ? (
              <div className="flex items-center gap-2">
                <img src={user.user.picture} alt="" className="rounded-full w-[clamp(24px,5vw,40px)] h-[clamp(24px,5vw,40px)]"/>
                <span className="text-[clamp(14px,4vw,36px)]">Welcome back, {user.user.given_name}!</span>
                {user.tg_linked && <img src="/svg/telegram-connected.svg" className="rounded-full w-[clamp(24px,5vw,40px)] h-[clamp(24px,5vw,40px)]" alt="" />}

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

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>© 2025 NU Space. All rights reserved.</p>
        <Link to="/apps/about">About Us</Link>
      </footer>
    </div>
  );
}
