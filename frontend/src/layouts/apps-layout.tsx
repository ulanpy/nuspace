"use client"

import { useState, useEffect } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { ThemeToggle } from "../components/theme-toggle"
import { LoginButton } from "../components/login-button"
import { useAuth } from "../context/auth-context"
import { LoginRequirementModal } from "../components/login-requirement-modal"

export default function AppsLayout() {
  const { isAuthenticated, login, refreshUserData } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Check if the current path is for Kupi&Prodai
  const isKupiProdaiPath = location.pathname.includes("/apps/kupi-prodai")

  // Show login modal for unauthenticated users trying to access Kupi&Prodai
  useEffect(() => {
    if (!isAuthenticated && isKupiProdaiPath) {
      setShowLoginModal(true)
    } else {
      setShowLoginModal(false)
    }
  }, [isAuthenticated, isKupiProdaiPath])

  // Refresh user data when the component mounts
  useEffect(() => {
    if (isAuthenticated) {
      refreshUserData()
    }
  }, [isAuthenticated, location.pathname])

  // Handle login from the modal
  const handleLogin = () => {
    login()
    setShowLoginModal(false)
  }

  // Handle modal dismissal
  const handleDismiss = () => {
    setShowLoginModal(false)
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-12 sm:h-14 items-center justify-between px-3 sm:px-4">
          <Link
            to="/"
            className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-sm sm:text-base">Back to Home</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LoginButton />
          </div>
        </div>
      </header>
      <main className="flex-1 container py-4 sm:py-6 px-3 sm:px-4">
        <Outlet />

        {/* Login Requirement Modal */}
        {showLoginModal && (
          <LoginRequirementModal
            title="Login Required"
            description="You need to login to access the Kupi&Prodai marketplace. Login to browse and sell items within the university community."
            onLogin={handleLogin}
            onDismiss={handleDismiss}
          />
        )}
      </main>
    </div>
  )
}
