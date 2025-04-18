"use client"

import { ThemeToggle } from "../components/theme-toggle"
import { AppGrid } from "../components/app-grid"
import { PersonalizedDashboard } from "@/components/personalized-dashboard"
import { LoginButton } from "../components/login-button"
import { useAuth } from "../context/auth-context"
import { GlowCarouselWithImage } from "../components/glow-carousel-with-images"

// Define carousel items with your image for the homepage
const homeCarouselItems = [
  {
    id: 1,
    content: (
      <div className="w-full h-full flex items-center justify-center">
        <img src="/images/nu-space-presentation.jpg" alt="Featured image" className="w-full h-full object-cover rounded-xl" />
      </div>
    ),
    gradient: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.06) 50%, rgba(194,65,12,0) 100%)",
    accentColor: "rgb(249 115 22)",
  },
  {
    id: 2,
    content: (
      <div className="w-full h-full flex items-center justify-center">
        <img src="/images/welcome-nu-space.jpg" alt="Featured image" className="w-full h-full object-cover rounded-xl" />
      </div>
    ),
    gradient: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
    accentColor: "rgb(59 130 246)",
  },
]

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  return (
    <div className="min-h-screen bg-background flex flex-col p-3 sm:p-4">
      {/* Header with login button */}
      <header className="w-full flex justify-between items-center mb-8">
        <ThemeToggle />
        <LoginButton />
      </header>

      <div className="flex-1 flex flex-col items-center">
        {/* Greeting */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {isAuthenticated && user?.user.given_name ? `Welcome back, ${user.user.given_name}!` : "Welcome to NU Space"}
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
      </footer>
    </div>
  )
}

