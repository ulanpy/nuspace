"use client"

import { useState, useEffect } from "react"
import { ExternalLink, Check } from "lucide-react"
import { Button } from "./ui/button"
import { Modal } from "./ui/modal"
import { useAuth } from "../context/auth-context"
import { Badge } from "./ui/badge"

// Emoji mapping based on the backend logic
const numberToEmoji = (num: number): string => {
  const emojis = ["🐬", "🦄", "🐖", "🐉", "🐁", "🐈", "🦍", "🐝", "🐺", "🐥"]
  // Adjust for 1-based indexing
  return emojis[num - 1] || "❓"
}

export function BindTelegramButton() {
  const { user, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [telegramLink, setTelegramLink] = useState("")
  const [confirmationEmoji, setConfirmationEmoji] = useState("")
  const [error, setError] = useState("")
  const [isLinked, setIsLinked] = useState(false)
  const [checkingLinkStatus, setCheckingLinkStatus] = useState(true)

  // Check if user is linked to Telegram
  useEffect(() => {
    const checkTelegramLink = async () => {
      if (!user?.sub) {
        setCheckingLinkStatus(false)
        return
      }

      try {
        const response = await fetch("http://localhost/api/linkedtg", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ sub: user.sub }),
        })

        if (response.ok) {
          const isUserLinked = await response.json()
          setIsLinked(isUserLinked)
        } else {
          console.error("Failed to check Telegram link status")
        }
      } catch (error) {
        console.error("Error checking Telegram link:", error)
      } finally {
        setCheckingLinkStatus(false)
      }
    }

    if (isAuthenticated) {
      checkTelegramLink()
    } else {
      setCheckingLinkStatus(false)
    }
  }, [user, isAuthenticated])

  // Update the handleBindTelegram function to use the correct sub field
  const handleBindTelegram = async () => {
    if (!user?.sub) {
      setError("User information not available")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Use the correct sub field from the user object
      const response = await fetch("http://localhost/api/bingtg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for cookies
        body: JSON.stringify({ sub: user.sub }),
      })

      if (!response.ok) {
        throw new Error("Failed to bind Telegram account")
      }

      const data = await response.json()

      // Set the telegram link and convert the number to emoji
      setTelegramLink(data.link)
      setConfirmationEmoji(numberToEmoji(data.correct_number))

      // Show the modal with instructions
      setShowModal(true)
    } catch (error) {
      console.error("Error binding Telegram:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (checkingLinkStatus) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center gap-1">
        <span className="animate-pulse">Checking...</span>
      </Button>
    )
  }

  if (isLinked) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
          <Check className="h-3 w-3" />
          <span>Telegram Linked</span>
        </Badge>
      </div>
    )
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
        onClick={handleBindTelegram}
        disabled={isLoading}
      >
        <ExternalLink className="h-4 w-4" />
        <span>{isLoading ? "Processing..." : "Bind to Telegram"}</span>
      </Button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Bind Your Telegram Account"
        description="Click the link below to open Telegram and confirm your account."
      >
        <div className="space-y-4 py-2">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              Tap the link below to open Telegram and connect your account
            </p>

            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              Open Telegram Bot
            </a>

            <div className="mt-4 p-4 border rounded-md bg-muted/50">
              <p className="text-sm font-medium mb-2">Confirmation Instructions:</p>
              <p className="text-sm text-muted-foreground mb-4">When the bot asks for confirmation, tap this emoji:</p>
              <div className="text-4xl">{confirmationEmoji}</div>
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-destructive mt-2">{error}</div>}
      </Modal>
    </>
  )
}

