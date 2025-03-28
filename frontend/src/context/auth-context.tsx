"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  name: string
  given_name: string
  family_name: string
  email: string
  preferred_username: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserData = async () => {
    try {
      const response = await fetch("http://localhost/api/me", {
        method: "GET",
        credentials: "include", // Important for cookies
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshToken = async () => {
    try {
      await fetch("http://localhost/api/refresh-token", {
        method: "POST",
        credentials: "include", // Important for cookies
      })
    } catch (error) {
      console.error("Error refreshing token:", error)
    }
  }

  useEffect(() => {
    // Fetch user data on initial load
    fetchUserData()

    // Set up token refresh interval
    const refreshInterval = setInterval(refreshToken, 240*1000) // 4 minutes

    return () => {
      clearInterval(refreshInterval)
    }
  }, [])

  const login = () => {
    window.location.href = "http://localhost/api/login"
  }

  const logout = () => {
    // Implement logout if needed
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

