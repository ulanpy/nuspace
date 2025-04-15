"use client"

import { kupiProdaiApi } from "@/api/kupi-prodai-api"
import { queryClient } from "@/api/query-client"
import { useUser } from "@/hooks/use-user"
import { createContext, useContext, useEffect, type ReactNode } from "react"

// Update the User interface to match the new API structure

interface AuthContextType {
  user: Types.User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Add this to the AuthContext to expose the refreshUserData function
export function AuthProvider({ children }: { children: ReactNode }) {
  const {user, isAuthenticated, isLoading} = useUser()


  const refreshToken = async () => {
    try {
      await fetch("/api/refresh-token", {
        method: "POST",
        credentials: "include", // Important for cookies
      })
    } catch (error) {
      console.error("Error refreshing token:", error)
    }
  }

  useEffect(() => {


    // Set up token refresh interval
    const refreshInterval = setInterval(refreshToken, 240*1000) // 5 seconds

    return () => {
      clearInterval(refreshInterval)
    }
  }, [])

  const login = () => {
    window.location.href = "/api/login"
  }

  const logout = () => {
    // Implement logout if needed
    queryClient.removeQueries({queryKey: kupiProdaiApi.getUserQueryOptions().queryKey})
    queryClient.removeQueries({queryKey: kupiProdaiApi.getUserProductsQueryOptions().queryKey})

  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
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
