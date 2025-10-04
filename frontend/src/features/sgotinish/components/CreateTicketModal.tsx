import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Label } from "@/components/atoms/label";
import { Switch } from "@/components/atoms/switch";
import { Send, GraduationCap, Building2, Wrench, AlertTriangle, Lightbulb, HelpCircle, Check } from "lucide-react";
import * as RadixSelect from "@radix-ui/react-select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sgotinishApi } from "../api/sgotinishApi";
import { TicketCategory } from "../types";
import { Modal } from "@/components/atoms/modal";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTicketModal({ isOpen, onClose, onSuccess }: CreateTicketModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    category: "" as TicketCategory | "",
    body: "",
    is_anonymous: false,
  });

  const createTicketMutation = useMutation({
    mutationFn: sgotinishApi.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "tickets" || query.queryKey[0] === "sg-tickets"
      });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) return;
    createTicketMutation.mutate({
      ...formData,
      category: formData.category as TicketCategory,
    });
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const titleMaxLength = 200;
  const bodyMaxLength = 5000;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Appeal">
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Anonymous Option */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="space-y-1">
              <Label htmlFor="anonymous" className="text-sm font-medium">
                Submit anonymously
              </Label>
              <p className="text-xs text-muted-foreground">
                Your name will not be visible to SG representatives.
              </p>
            </div>
            <Switch
              id="anonymous"
              checked={formData.is_anonymous}
              onCheckedChange={(checked) => handleInputChange("is_anonymous", checked)}
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
  );
}


