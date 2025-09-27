import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Label } from "@/components/atoms/label";
import { Switch } from "@/components/atoms/switch";
import { ArrowLeft, Send, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { ROUTES } from "@/data/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sgotinishApi } from "../api/sgotinishApi";
import { TicketCategory } from "../types";

interface CreateTicketProps {
  onBack?: () => void;
}

export default function CreateTicket({ onBack }: CreateTicketProps) {
  const navigate = useNavigate();
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
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      navigate(ROUTES.APPS.SGOTINISH.STUDENT.ROOT);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) return;
    createTicketMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <MotionWrapper>
      <div className="min-h-screen bg-background flex flex-col p-3 sm:p-4 pb-[calc(56px+env(safe-area-inset-bottom))]">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          {/* Back Button */}
          {onBack && (
            <div className="mb-4">
              <Button variant="ghost" onClick={onBack} className="p-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to dashboard
              </Button>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create New Appeal</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit your appeal to the Student Government
            </p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Appeal Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Title *
                    </Label>
                    <span className="text-xs text-gray-500">
                      {formData.title.length} / 200
                    </span>
                  </div>
                  <Input
                    id="title"
                    placeholder="Brief description of your appeal"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    required
                    maxLength={200}
                    className="w-full"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium">
                    Category *
                  </Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <div className="flex justify-between">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description *
                    </Label>
                    <span className="text-xs text-gray-500">
                      {formData.body.length} / 5000
                    </span>
                  </div>
                  <Textarea
                    id="description"
                    placeholder="Provide detailed information about your appeal..."
                    value={formData.body}
                    onChange={(e) => handleInputChange("body", e.target.value)}
                    required
                    maxLength={5000}
                    rows={6}
                    className="w-full resize-none"
                  />
                </div>

                {/* Anonymous Option */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-1">
                    <Label htmlFor="anonymous" className="text-sm font-medium">
                      Submit anonymously
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Your name will not be visible to SG representatives
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
                    onClick={onBack || (() => navigate(ROUTES.APPS.SGOTINISH.STUDENT.ROOT))}
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
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Your appeal will be reviewed by SG representatives. You'll receive updates via email.
            </p>
          </div>
        </div>
      </div>
    </MotionWrapper>
  );
}