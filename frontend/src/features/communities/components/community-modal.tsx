"use client";

import { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/atoms/modal";
import { useCreateCommunity } from '@/features/communities/hooks/use-create-community';
import { useUpdateCommunity } from '@/features/communities/hooks/use-update-community';
import { useDeleteCommunity } from '@/features/communities/hooks/use-delete-community';
import { useUser } from "@/hooks/use-user";
import {
  CreateCommunityData,
  EditCommunityData,
  Community,
  CommunityPermissions,
  CommunityType,
  CommunityCategory,
  CommunityRecruitmentStatus,
} from "@/features/shared/campus/types";

// Import all the new modular components
import { UnifiedCommunityMediaUpload } from '@/features/communities/components/unified-community-media-upload';
import type { CommunityUploadHandle } from '@/features/communities/components/unified-community-media-upload';
import { CommunityDetailsForm } from '@/features/communities/components/community-details-form';
import { CommunityDescription } from '@/features/communities/components/community-description';
import { DeleteConfirmation } from '@/components/molecules/delete-confirmation';
import { CommunityActions } from '@/features/communities/components/community-actions';
import {
  useCommunityForm,
  CommunityFormProvider,
} from '@/context/community-form-context';
import { useQueryClient } from "@tanstack/react-query";
import { pollForCommunityImages } from "@/utils/polling";
import { useInitializeMedia } from '@/features/media/hooks/use-initialize-media';
import { campuscurrentAPI } from '@/features/communities/api/communities-api';
import { useToast } from "@/hooks/use-toast";
import { LoginModal } from "@/components/molecules/login-modal";

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditMode: boolean;
  community?: Community;
  permissions?: CommunityPermissions;
}

export function CommunityModal({
  isOpen,
  onClose,
  isEditMode,
  community,
  permissions,
}: CommunityModalProps) {
  const { user } = useUser();
  const { handleCreate, isCreating } = useCreateCommunity();
  const { handleUpdate, isUpdating } = useUpdateCommunity();
  const { handleDelete, isDeleting } = useDeleteCommunity();
  const { toast } = useToast();
  

  const isProcessing = isCreating || isUpdating || isDeleting;

  const queryClient = useQueryClient();
  const profilesRef = useRef<CommunityUploadHandle>(null);
  const bannersRef = useRef<CommunityUploadHandle>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize media for edit/create flows via shared hook
  useInitializeMedia({ isEditMode, mediaItems: community?.media });

  // Require authentication to use the modal
  if (!user) {
    return (
      <LoginModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onClose}
        title="Login Required"
        message={isEditMode ? "You need to be logged in to edit communities." : "You need to be logged in to create communities."}
      />
    );
  }

  const isValidUrl = (value: string): boolean => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const ensureHttp = (val: string | undefined | null): string | undefined => {
    if (!val) return undefined;
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleSubmit = async (
    formData: CreateCommunityData | EditCommunityData,
    resetForm: () => void
  ) => {
    if (!user) return;

    let operationSucceeded = false;
    try {
      const isRecruitmentOpen = (formData as EditCommunityData).recruitment_status === CommunityRecruitmentStatus.open;
      const link = ensureHttp((formData as EditCommunityData).recruitment_link || "");

      if (isRecruitmentOpen && !link) {
        toast({
          title: "Recruitment link required",
          description: "Please provide a recruitment link when recruitment status is open",
          variant: "destructive",
        });
        return;
      }

      if (isRecruitmentOpen && link && !isValidUrl(link)) {
        toast({
          title: "Invalid recruitment URL",
          description: "Please enter a valid URL starting with https:// or http://",
          variant: "destructive",
        });
        return;
      }

      if (isEditMode && community) {
        // Update existing community
        const editData: EditCommunityData = {
          name: formData.name,
          description: formData.description,
          email: ((formData as EditCommunityData).email || "").trim() || undefined,
          recruitment_status: (formData as EditCommunityData).recruitment_status,
          established: (formData as EditCommunityData).established,
          telegram_url: formData.telegram_url,
          instagram_url: formData.instagram_url,
        };

        // Only include recruitment_link when status is open and link is non-empty
        if (isRecruitmentOpen && link) {
          editData.recruitment_link = link;
        }

        const updated = await handleUpdate(community.id.toString(), editData);
        operationSucceeded = Boolean(updated);
        if (operationSucceeded) {
          resetForm();
          onClose();
        }
 
        // Run media operations in background; do not block modal close
        void (async () => {
          try {
            await profilesRef.current?.deleteMarked();
            await profilesRef.current?.upload(updated.id);
          } catch (mediaError) {
            console.warn("Profile media ops failed:", mediaError);
          }
        })();

        void (async () => {
          try {
            await bannersRef.current?.deleteMarked();
            await bannersRef.current?.upload(updated.id);
          } catch (mediaError) {
            console.warn("Banner media ops failed:", mediaError);
          }
        })();

        // Refresh queries immediately and poll in background (do not block modal close)
        queryClient.invalidateQueries({
          queryKey: ["campusCurrent", "communities"],
        });
        queryClient.invalidateQueries({
          queryKey: ["campusCurrent", "community", updated.id.toString()],
        });
        void pollForCommunityImages(
          updated.id,
          queryClient,
          "campusCurrent",
          campuscurrentAPI.getCommunityQueryOptions
        );
      } else {
        // Create new community
        const createData: CreateCommunityData = {
          name: formData.name || "",
          type: (formData as CreateCommunityData).type || CommunityType.club,
          category: (formData as CreateCommunityData).category || CommunityCategory.academic,
          email: (((formData as CreateCommunityData).email || "").trim()) || undefined,
          recruitment_status: (formData as CreateCommunityData).recruitment_status,
          head: user.user.sub,
          established: (formData as CreateCommunityData).established || new Date().toISOString().split('T')[0],
          description: formData.description || "",
          telegram_url: formData.telegram_url || undefined,
          instagram_url: formData.instagram_url || undefined,
        };

        // Only include recruitment_link when status is open and link is non-empty
        if (isRecruitmentOpen && link) {
          createData.recruitment_link = link;
        }

        const created = await handleCreate(createData);
        operationSucceeded = Boolean(created);
        if (operationSucceeded) {
          resetForm();
          onClose();
        }

        // Upload media for both zones after creation in background (non-blocking)
        void profilesRef.current?.upload(created.id).catch((mediaError) => {
          console.warn("Failed to upload profile media:", mediaError);
        });
        void bannersRef.current?.upload(created.id).catch((mediaError) => {
          console.warn("Failed to upload banner media:", mediaError);
        });

        // Refresh queries immediately and poll in background (do not block modal close)
        queryClient.invalidateQueries({
          queryKey: ["campusCurrent", "communities"],
        });
        queryClient.invalidateQueries({
          queryKey: ["campusCurrent", "community", created.id.toString()],
        });
        void pollForCommunityImages(
          created.id,
          queryClient,
          "campusCurrent",
          campuscurrentAPI.getCommunityQueryOptions
        );
      }
 
      // Closing is handled immediately on success above; keep finally fallback
    } catch (error) {
      console.error(
        `Failed to ${isEditMode ? "update" : "create"} community:`,
        error
      );
    } finally {
      if (operationSucceeded) {
        // No-op since we already closed; keep as safety net
      }
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!community) return;

    try {
      await handleDelete(community.id.toString());
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error("Failed to delete community:", error);
    }
  };

  return (
    <CommunityFormProvider
      isEditMode={isEditMode}
      community={community}
      permissions={permissions}
    >
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditMode ? "Edit Community" : "Create Community"}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-6">
          {!isEditMode && (
            <div className="rounded-lg border border-amber-200/60 dark:border-amber-700/30 bg-gradient-to-r from-amber-50 to-pink-50 dark:from-amber-900/20 dark:to-pink-900/10 p-4">
              <div className="text-sm md:text-base">
                <span className="font-semibold">Anyone can create a community.</span> Rally people around your passion — game design, robotics, film nights, creative writing, you name it. Not just registered clubs.
              </div>
            </div>
          )}
          {/* Media Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UnifiedCommunityMediaUpload ref={profilesRef} type="communityProfiles" />
            <UnifiedCommunityMediaUpload ref={bannersRef} type="communityBanners" />
          </div>

          {/* Community Details */}
          <CommunityDetailsForm />

          {/* Description */}
          <CommunityDescription />

          {/* Delete Confirmation */}
          <DeleteConfirmation
            title="Community"
            isVisible={showDeleteConfirm}
            isDeleting={isDeleting}
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteConfirm}
          />

          {/* Actions */}
          <CommunityActionsWrapper
            isProcessing={isProcessing}
            onClose={onClose}
            onSubmit={handleSubmit}
            onDelete={handleDeleteClick}
          />
        </div>
      </Modal>
    </CommunityFormProvider>
  );
}

// Wrapper component to handle form context within CommunityActions
function CommunityActionsWrapper({
  isProcessing,
  onClose,
  onSubmit,
  onDelete,
}: {
  isProcessing: boolean;
  onClose: () => void;
  onSubmit: (
    formData: CreateCommunityData | EditCommunityData,
    resetForm: () => void
  ) => void;
  onDelete: () => void;
}) {
  const formContext = useCommunityForm();
  const { formData, resetForm, validateForm } = formContext;
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const validation = validateForm();
    setIsFormValid(validation.isValid);
  }, [formData, validateForm]);

  const handleSubmit = () => {
    const validation = validateForm();
    if (!validation.isValid) {
      toast({
        title: "Form validation failed",
        description: validation.errors.join(". "),
        variant: "destructive",
      });
      return;
    }
    onSubmit(formData, resetForm);
  };

  return (
    <CommunityActions
      isProcessing={isProcessing}
      onCancel={onClose}
      onSubmit={handleSubmit}
      isValid={isFormValid}
      onDelete={onDelete}
    />
  );
}

