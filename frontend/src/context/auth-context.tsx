"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

// Update the User interface to match the new API structure
interface User {
  user: {
    sub: string
    exp?: number
    iat?: number
    auth_time?: number
    jti?: string
    iss?: string
    aud?: string
    typ?: string
    azp?: string
    sid?: string
    acr?: string
    name: string
    given_name: string
    family_name: string
    email: string
    preferred_username: string
    email_verified?: boolean
    scope?: string
    realm_access?: {
      roles: string[]
    }
    resource_access?: {
      account: {
        roles: string[]
      }
    }
  }
  tg_linked: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Add this to the AuthContext to expose the refreshUserData function
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

  const refreshUserData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("http://localhost/api/me", {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        return userData
      }
    } catch (error) {
      console.error("Error refreshing user data:", error)
    } finally {
      setIsLoading(false)
    }
    return null
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
    const refreshInterval = setInterval(refreshToken, 240*1000) // 5 seconds

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
        refreshUserData,
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
