"use client";

import { useState } from "react";
import { Modal } from "../../atoms/modal";
import { Button } from "../../atoms/button";
import { Copy, Check, Heart } from "lucide-react";

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DonateModal({ isOpen, onClose }: DonateModalProps) {
  const [copied, setCopied] = useState(false);
  const kaspiNumber = "+77072818516";
  const name = "Ulan";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(kaspiNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Support Nuspace"
      description="Help us keep the platform running"
      className="max-w-sm"
    >
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
          <Heart className="h-6 w-6" />
          <span className="text-lg font-semibold">Thank you for your support!</span>
        </div>
        
        <div className="w-full p-4 bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Kaspi Transfer</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-lg font-semibold">{kaspiNumber}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-8 w-8"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{name}</p>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Your support helps us sustain our Nuspace servers and maintain the platform for the community.
        </p>

        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    </Modal>
  );
}
