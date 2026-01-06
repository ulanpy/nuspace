"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/atoms/modal";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { Label } from "@/components/atoms/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Save } from "lucide-react";
import { campuscurrentAPI } from '@/features/communities/api/communities-api';
import { useQueryClient } from "@tanstack/react-query";

export interface Achievement {
  id?: number;
  description: string;
  year: number;
  community_id?: number;
  created_at?: string;
  updated_at?: string;
}

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: number;
  initialAchievements: Achievement[];
}

export function AchievementsModal({
  isOpen,
  onClose,
  communityId,
  initialAchievements,
}: AchievementsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setAchievements(initialAchievements.length > 0 ? [...initialAchievements] : []);
      setDeletedIds([]);
    }
  }, [isOpen, initialAchievements]);

  const handleAddAchievement = () => {
    const currentYear = new Date().getFullYear();
    setAchievements([
      ...achievements,
      { description: "", year: currentYear },
    ]);
  };

  const handleRemoveAchievement = (index: number) => {
    const achievement = achievements[index];
    if (achievement.id) {
      setDeletedIds([...deletedIds, achievement.id]);
    }
    setAchievements(achievements.filter((_, i) => i !== index));
  };

  const handleUpdateAchievement = (
    index: number,
    field: "description" | "year",
    value: string | number
  ) => {
    const updated = [...achievements];
    updated[index] = {
      ...updated[index],
      [field]: field === "year" ? parseInt(String(value)) : value,
    };
    setAchievements(updated);
  };

  const validateAchievements = (): boolean => {
    for (const achievement of achievements) {
      if (!achievement.description.trim()) {
        toast({
          title: "Validation Error",
          description: "All achievements must have a description",
          variant: "destructive",
        });
        return false;
      }
      if (!achievement.year || achievement.year < 1900 || achievement.year > 2100) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid year (1900-2100)",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateAchievements()) return;

    setIsSaving(true);
    try {
      // Delete removed achievements
      for (const id of deletedIds) {
        await campuscurrentAPI.deleteAchievement(communityId, id);
      }

      // Create or update achievements
      for (const achievement of achievements) {
        if (achievement.id) {
          // Update existing
          await campuscurrentAPI.updateAchievement(communityId, achievement.id, {
            description: achievement.description,
            year: achievement.year,
          });
        } else {
          // Create new
          await campuscurrentAPI.createAchievement({
            community_id: communityId,
            description: achievement.description,
            year: achievement.year,
          });
        }
      }

      toast({
        title: "Success",
        description: "Achievements updated successfully",
      });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ 
        queryKey: ["campusCurrent", "community", communityId.toString()] 
      });

      onClose();
    } catch (error: any) {
      console.error("Error saving achievements:", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to save achievements",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Achievements"
      description="Add, edit, or remove community achievements"
    >
      <div className="space-y-4">
        {/* Achievements List */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {achievements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No achievements yet. Click "Add Achievement" to get started.
            </div>
          ) : (
            achievements.map((achievement, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg space-y-3 bg-card"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label htmlFor={`achievement-${index}-description`}>
                        Description
                      </Label>
                      <Textarea
                        id={`achievement-${index}-description`}
                        value={achievement.description}
                        onChange={(e) =>
                          handleUpdateAchievement(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="e.g., Won first place in national competition"
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`achievement-${index}-year`}>
                        Year
                      </Label>
                      <Input
                        id={`achievement-${index}-year`}
                        type="number"
                        value={achievement.year}
                        onChange={(e) =>
                          handleUpdateAchievement(
                            index,
                            "year",
                            e.target.value
                          )
                        }
                        min={1900}
                        max={2100}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAchievement(index)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Achievement Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleAddAchievement}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Achievement
        </Button>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
