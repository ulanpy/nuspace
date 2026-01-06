"use client";

import { Button } from "@/components/atoms/button";
import { FileText } from "lucide-react";

interface CreateAppealButtonProps {
  onClick: () => void;
}

export function CreateAppealButton({ onClick }: CreateAppealButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
    >
      <FileText className="mr-2 h-4 w-4" />
      <span className="hidden sm:inline">Create Appeal</span>
      <span className="sm:hidden">Create</span>
    </Button>
  );
}
