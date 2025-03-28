"use client"

import { ThemeToggle } from "../components/theme-toggle"
import { AppGrid } from "../components/app-grid"
import { GlowCarousel } from "@/components/glow-carousel"
import { motion } from "framer-motion"
import { PersonalizedDashboard } from "@/components/personalized-dasboard"
import { LoginButton } from "../components/login-button"
import { useAuth } from "../context/auth-context"

const carouselItems = [
  {
    id: 1,
    content: (
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <motion.h2
          className="text-3xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Welcome to our platform
        </motion.h2>
        <motion.p
          className="text-muted-foreground max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Discover amazing features and services tailored just for you
        </motion.p>
      </div>
    ),
    gradient: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
    accentColor: "rgb(59 130 246)",
  },
  {
    id: 2,
    content: (
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <motion.h2
          className="text-3xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Powerful Analytics
        </motion.h2>
        <motion.p
          className="text-muted-foreground max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Gain insights with our advanced analytics and reporting tools
        </motion.p>
      </div>
    ),
    gradient: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.06) 50%, rgba(194,65,12,0) 100%)",
    accentColor: "rgb(249 115 22)",
  },
  {
    id: 3,
    content: (
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <motion.h2
          className="text-3xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Seamless Integration
        </motion.h2>
        <motion.p
          className="text-muted-foreground max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Connect with your favorite tools and services effortlessly
        </motion.p>
      </div>
    ),
    gradient: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.06) 50%, rgba(21,128,61,0) 100%)",
    accentColor: "rgb(34 197 94)",
  },
  {
    id: 4,
    content: (
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <motion.h2
          className="text-3xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          24/7 Support
        </motion.h2>
        <motion.p
          className="text-muted-foreground max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Our dedicated team is always ready to help you succeed
        </motion.p>
      </div>
    ),
    gradient: "radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.06) 50%, rgba(185,28,28,0) 100%)",
    accentColor: "rgb(239 68 68)",
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
            {isAuthenticated ? `Welcome back, ${user?.given_name}!` : "Welcome to NU Space"}
          </h1>
          <p className="text-muted-foreground">
            {isAuthenticated ? "Your personalized university dashboard" : "Login to access your personalized dashboard"}
          </p>
        </div>

      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <GlowCarousel items={carouselItems}/>
      </div>
      <div className="flex flex-col items-center gap-8 sm:gap-12">
      <div className="w-full mt-4 sm:mt-8">
        <PersonalizedDashboard />
      </div>
      <AppGrid />
      </div>
      </div>
    </div>
  )
}

