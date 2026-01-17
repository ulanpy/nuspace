"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Label } from "@/components/atoms/label";
import { Switch } from "@/components/atoms/switch";
import { Send, GraduationCap, Building2, Wrench, AlertTriangle, Lightbulb, HelpCircle, Check, Lock } from "lucide-react";
import * as RadixSelect from "@radix-ui/react-select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sgotinishApi } from '../api/sgotinish-api';
import { TicketCategory } from "../types";
import { Modal } from "@/components/atoms/modal";
import { generateTicketKey, hashTicketKey } from "../utils/ticket-keys";
import { useToast } from "@/hooks/use-toast";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTicketModal({ isOpen, onClose, onSuccess }: CreateTicketModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pendingTicketKeyRef = useRef<string | null>(null);
  const [ticketLink, setTicketLink] = useState<string | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "" as TicketCategory | "",
    body: "",
    is_anonymous: false,
  });

  const createTicketMutation = useMutation({
    mutationFn: sgotinishApi.createTicket,
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "tickets" || query.queryKey[0] === "sg-tickets"
      });
      if (ticket?.is_anonymous && pendingTicketKeyRef.current) {
        const ticketKey = pendingTicketKeyRef.current;
        pendingTicketKeyRef.current = null;
        const link = `${window.location.origin}/t?key=${encodeURIComponent(ticketKey)}`;
        setTicketLink(link);
        setIsLinkModalOpen(true);
      }
      onSuccess(); // Close modal and trigger any other success actions
      // Reset form after successful submission
      setFormData({
        title: "",
        category: "" as TicketCategory | "",
        body: "",
        is_anonymous: false,
      });
    },
    onError: (error) => {
      console.error("Error creating ticket:", error);
      pendingTicketKeyRef.current = null;
      // Here you could show a toast notification to the user
    },
  });

  const categories = [
    {
      value: TicketCategory.academic,
      label: "Academic",
      description: "Course-related issues, grades, academic policies",
      icon: <GraduationCap className="h-4 w-4" />
    },
    {
      value: TicketCategory.administrative,
      label: "Administrative", 
      description: "Registration, documents, university procedures",
      icon: <Building2 className="h-4 w-4" />
    },
    {
      value: TicketCategory.technical,
      label: "Technical",
      description: "IT issues, system problems, technical support",
      icon: <Wrench className="h-4 w-4" />
    },
    {
      value: TicketCategory.complaint,
      label: "Complaint",
      description: "Report issues, concerns, or problems",
      icon: <AlertTriangle className="h-4 w-4" />
    },
    {
      value: TicketCategory.suggestion,
      label: "Suggestion",
      description: "Ideas for improvement, feedback, recommendations",
      icon: <Lightbulb className="h-4 w-4" />
    },
    {
      value: TicketCategory.other,
      label: "Other",
      description: "Any other matter not covered above",
      icon: <HelpCircle className="h-4 w-4" />
    }
  ];

  function CategorySelectItem({
    category,
  }: {
    category: (typeof categories)[number];
  }) {
    return (
      <RadixSelect.Item
        key={category.value}
        value={category.value}
        className="relative flex w-full cursor-default select-none items-start gap-3 rounded-sm px-2 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      >
        <span className="absolute left-2 top-2 flex h-3.5 w-3.5 items-center justify-center">
          <RadixSelect.ItemIndicator>
            <Check className="h-4 w-4" />
          </RadixSelect.ItemIndicator>
        </span>
        <span className="ml-6 mt-0.5 text-muted-foreground">{category.icon}</span>
        <div className="flex flex-col">
          <RadixSelect.ItemText asChild>
            <span className="font-medium text-foreground">{category.label}</span>
          </RadixSelect.ItemText>
          <span className="text-xs text-muted-foreground">{category.description}</span>
        </div>
      </RadixSelect.Item>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) return;
    const payload = {
      ...formData,
      category: formData.category as TicketCategory,
    };
    if (formData.is_anonymous) {
      const ticketKey = generateTicketKey();
      pendingTicketKeyRef.current = ticketKey;
      payload.owner_hash = await hashTicketKey(ticketKey);
    }
    createTicketMutation.mutate(payload);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyLink = async () => {
    if (!ticketLink) return;
    try {
      await navigator.clipboard.writeText(ticketLink);
      toast({
        title: "Link copied",
        description: "Keep it safe. Anyone with the link can access this ticket.",
        variant: "success",
        duration: 6000,
      });
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = ticketLink;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast({
        title: "Link copied",
        description: "Keep it safe. Anyone with the link can access this ticket.",
        variant: "success",
        duration: 6000,
      });
    }
  };
  
  const titleMaxLength = 200;
  const bodyMaxLength = 5000;

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Appeal">
        <div className="mb-4 flex gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-600 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-slate-300">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
            <Lock className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Private line to the Student Government</p>
            <p className="text-sm leading-snug">
              Create an appeal, even anonymously. It will be delivered directly to the right SG members.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Anonymous Option */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div className="space-y-1">
              <Label htmlFor="anonymous" className="text-sm font-medium">
                Submit anonymously
              </Label>
              <p className="text-xs text-muted-foreground">
                Your name will not be visible to anyone else.
              </p>
            </div>
            <Switch
              id="anonymous"
              checked={formData.is_anonymous}
              onCheckedChange={(checked) => handleInputChange("is_anonymous", checked)}
            />
          </div>
          {/* Title */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="title" className="text-sm font-medium">
                Title *
              </Label>
              <span className="text-xs text-muted-foreground">
                {formData.title.length} / {titleMaxLength}
              </span>
            </div>
            <Input
              id="title"
              placeholder="Brief description of your appeal"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
              maxLength={titleMaxLength}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="category" className="text-sm font-medium">
                Category *
              </Label>
              <p className="text-xs text-muted-foreground">
                Choose the category that best describes your appeal to help us route it to the right department.
              </p>
            </div>
            <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent
                className="z-[10001] max-h-72 max-w-[calc(100vw-1rem)] overflow-auto"
                position="popper"
                side="bottom"
                sideOffset={8}
                align="start"
                collisionPadding={16}
                avoidCollisions={true}
                collisionBoundary="viewport"
              >
                {categories.map((category) => (
                  <CategorySelectItem key={category.value} category={category} />
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
             <div className="flex justify-between items-center">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description *
                </Label>
                <span className="text-xs text-muted-foreground">
                  {formData.body.length} / {bodyMaxLength}
                </span>
             </div>
            <Textarea
              id="description"
              placeholder="Provide detailed information about your appeal..."
              value={formData.body}
              onChange={(e) => handleInputChange("body", e.target.value)}
              required
              maxLength={bodyMaxLength}
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTicketMutation.isPending || !formData.title || !formData.category || !formData.body}
              className="flex-1"
            >
              {createTicketMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Appeal
                </>
              )}
            </Button>
          </div>
        </form>
    </Modal>
    <Modal
      isOpen={isLinkModalOpen}
      onClose={() => {
        setIsLinkModalOpen(false);
        setTicketLink(null);
      }}
      title="Your private ticket link"
    >
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          This link is your only way to access the anonymous ticket. We cannot recover it if lost.
        </div>
        <div className="rounded-md border bg-muted/30 p-3 text-sm break-all">
          {ticketLink}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsLinkModalOpen(false);
              setTicketLink(null);
            }}
          >
            Close
          </Button>
          <Button onClick={handleCopyLink}>Copy link</Button>
        </div>
      </div>
    </Modal>
    </>
  );
}


