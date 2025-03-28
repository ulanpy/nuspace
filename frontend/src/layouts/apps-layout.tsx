import { Link, Outlet } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { ThemeToggle } from "../components/theme-toggle"
import { LoginButton } from "../components/login-button"

export default function AppsLayout() {
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
      </main>
    </div>
  )
}


