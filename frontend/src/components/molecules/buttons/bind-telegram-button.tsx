"use client";

import { useState, useEffect, useRef } from "react";
import { ExternalLink, CheckCheck } from "lucide-react";
import { Button } from "../../atoms/button";
import { Modal } from "../../atoms/modal";
import { Badge } from "../../atoms/badge";
import { useToast } from "../../../hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { PrivacyModal } from "../atoms/PrivacyModal";
// Emoji mapping based on the backend logic
const numberToEmoji = (num: number): string => {
  const emojis = ["🐬", "🦄", "🐖", "🐉", "🐁", "🐈", "🦍", "🐝", "🐺", "🐥"];
  // Adjust for 1-based indexing
  return emojis[num - 1] || "❓";
};

export function BindTelegramButton() {
  const { user, refetchUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [telegramLink, setTelegramLink] = useState("");
  const [confirmationEmoji, setConfirmationEmoji] = useState("");
  const [error, setError] = useState("");
  const [isLinked, setIsLinked] = useState(user?.tg_linked || false);
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  // Check if user is linked to Telegram directly from the user object
  useEffect(() => {
    setIsLinked(user?.tg_linked || false);
  }, [user]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Start polling for Telegram status when modal is shown
  useEffect(() => {
    if (showModal && !isLinked) {
      startPollingTelegramStatus();
    } else if (!showModal && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [showModal, isLinked]);

  const startPollingTelegramStatus = () => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Start polling every 2 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();

          // If Telegram is now linked, update UI and stop polling
          if (userData.tg_linked) {
            setIsLinked(true);
            setShowModal(false);

            // Refresh the auth context to update the user data
            await refetchUser();

            toast({
              title: "Success",
              description:
                "Your Telegram account has been linked successfully!",
              variant: "success",
            });

            // Stop polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error("Error checking Telegram status:", error);
      }
    }, 2000);
  };

  const handleBindTelegram = async () => {
    // Use the correct user identifier - check both possible locations
    const userIdentifier = user?.user?.sub;

    if (!userIdentifier) {
      setError("User information not available");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/bingtg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for cookies
        body: JSON.stringify({ sub: userIdentifier }),
      });

      if (!response.ok) {
        throw new Error("Failed to bind Telegram account");
      }

      const data = await response.json();

      // Set the telegram link and convert the number to emoji
      setTelegramLink(data.link);
      setConfirmationEmoji(numberToEmoji(data.correct_number));

      // Show the modal with instructions
      setShowModal(true);
    } catch (error) {
      console.error("Error binding Telegram:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (isLinked) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200"
        >
          <CheckCheck className="h-3 w-3" />
          <span>Tg Connected</span>
        </Badge>
      </div>
    );
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
        onClick={(e) => {
          e.preventDefault();
          window.open(telegramLink, "_blank", "width=600,height=600");
        }}
      >
        <ExternalLink className="h-4 w-4" />
        Open Telegram Bot
      </a>

      <div className="mt-4 p-4 border rounded-md bg-muted/50">
        <p className="text-sm font-medium mb-2">Confirmation Instructions:</p>
        <p className="text-sm text-muted-foreground mb-4">
          When the bot asks for confirmation, tap this emoji:
        </p>
        <div className="text-4xl">{confirmationEmoji}</div>
      </div>
    </div>
  </div>

  {error && <div className="text-sm text-destructive mt-2">{error}</div>}

  <div className="mt-4 text-center text-xs text-muted-foreground">
    By continuing the registration process, you agree to our{" "}
    <button
      className="underline text-blue-600 hover:text-blue-800"
      onClick={() => setShowPrivacy(true)}
    >
      Privacy Policy
    </button>.
  </div>
</Modal>

<PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

    </>
  );
}
