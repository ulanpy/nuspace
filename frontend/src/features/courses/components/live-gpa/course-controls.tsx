"use client";

import { ChevronDown, Download, Plus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CourseControlsProps {
  onAddItem: () => void;
  onOpenTemplates: () => void;
  onShareTemplate: () => void;
}

export function CourseControls({
  onAddItem,
  onOpenTemplates,
  onShareTemplate,
}: CourseControlsProps) {
  return (
    <div className="space-y-2">
      <Button size="sm" className="w-full" onClick={onAddItem}>
        <Plus />
        Add assignment
      </Button>

      <ButtonGroup orientation="vertical" className="w-full" aria-label="Grading setup">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              Grading setup
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onOpenTemplates}>
              <Download />
              Import from classmate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShareTemplate}>
              <Share2 />
              Share with classmates
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    </div>
  );
}
