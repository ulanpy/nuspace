import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Label } from "@/components/atoms/label";
import { Switch } from "@/components/atoms/switch";
import { Send, FileText } from "lucide-react";
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

  const categories = Object.values(TicketCategory).map(category => ({
    value: category,
    label: category.charAt(0).toUpperCase() + category.slice(1),
  }));

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
            <Label htmlFor="category" className="text-sm font-medium">
              Category *
            </Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
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


