"use client";

import { useState } from "react";
import { Button } from "../../atoms/button";
import { Heart } from "lucide-react";
import { DonateModal } from "./donate-modal";

export function DonateButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 text-pink-600 border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:text-pink-400 dark:border-pink-800 dark:hover:bg-pink-900/20 dark:hover:border-pink-700 min-w-0"
      >
        <Heart className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs sm:text-sm">Support</span>
      </Button>
      
      <DonateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
