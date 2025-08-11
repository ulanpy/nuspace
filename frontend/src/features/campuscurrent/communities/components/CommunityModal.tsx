import { useState, useRef } from "react";
import { Modal } from "@/components/atoms/modal";
import { useCreateCommunity } from "@/features/campuscurrent/communities/hooks/useCreateCommunity";
import { useUpdateCommunity } from "@/features/campuscurrent/communities/hooks/useUpdateCommunity";
import { useDeleteCommunity } from "@/features/campuscurrent/communities/hooks/useDeleteCommunity";
import { useUser } from "@/hooks/use-user";
import {
  CreateCommunityData,
  EditCommunityData,
  Community,
  CommunityPermissions,
  CommunityType,
  CommunityCategory,
  RecruitmentStatus,
} from "@/features/campuscurrent/types/types";

// Import all the new modular components
import { UnifiedCommunityMediaUpload } from "@/features/campuscurrent/communities/components/UnifiedCommunityMediaUpload";
import type { CommunityUploadHandle } from "@/features/campuscurrent/communities/components/UnifiedCommunityMediaUpload";
import { CommunityDetailsForm } from "@/features/campuscurrent/communities/components/forms/CommunityDetailsForm";
import { CommunityDescription } from "@/features/campuscurrent/communities/components/forms/CommunityDescription";
import { DeleteConfirmation } from "@/components/molecules/DeleteConfirmation";
import { CommunityActions } from "@/features/campuscurrent/communities/components/forms/CommunityActions";
import {
  useCommunityForm,
  CommunityFormProvider,
} from "@/context/CommunityFormContext";
import { useQueryClient } from "@tanstack/react-query";
import { pollForCommunityImages } from "@/utils/polling";
import { useInitializeMedia } from "@/features/media/hooks/useInitializeMedia";
import { campuscurrentAPI } from "@/features/campuscurrent/communities/api/communitiesApi";
import { useToast } from "@/hooks/use-toast";

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

  const isValidUrl = (value: string): boolean => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (
    formData: CreateCommunityData | EditCommunityData,
    resetForm: () => void
  ) => {
    if (!user) return;

    try {
      const isOpen = (formData as EditCommunityData).recruitment_status === RecruitmentStatus.open;
      const link = (formData as EditCommunityData).recruitment_link?.trim();

      if (isOpen && !link) {
        toast({
          title: "Recruitment link required",
          description: "Please provide a recruitment link when recruitment status is open",
          variant: "destructive",
        });
        return;
      }

      if (isOpen && link && !isValidUrl(link)) {
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
          email: (formData as EditCommunityData).email,
          recruitment_status: (formData as EditCommunityData).recruitment_status,
          established: (formData as EditCommunityData).established,
          telegram_url: formData.telegram_url,
          instagram_url: formData.instagram_url,
        };

        // Only include recruitment_link when status is open and link is non-empty
        if (isOpen && link) {
          editData.recruitment_link = link;
        }

        const updated = await handleUpdate(community.id.toString(), editData);

        // First delete marked media for both zones
        await profilesRef.current?.deleteMarked();
        await bannersRef.current?.deleteMarked();

        // Then upload new media for both zones
        await profilesRef.current?.upload(updated.id);
        await bannersRef.current?.upload(updated.id);

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
          type: CommunityType.club,
          category: CommunityCategory.academic,
          email: (formData as CreateCommunityData).email || "",
          recruitment_status: (formData as CreateCommunityData).recruitment_status,
          head: user.user.sub,
          established: formData.established || "",
          description: formData.description || "",
          telegram_url: formData.telegram_url || "",
          instagram_url: formData.instagram_url || "",
        };

        // Only include recruitment_link when status is open and link is non-empty
        if (isOpen && link) {
          createData.recruitment_link = link;
        }

        const created = await handleCreate(createData);

        // Upload media for both zones after creation
        await profilesRef.current?.upload(created.id);
        await bannersRef.current?.upload(created.id);

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

      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error(
        `Failed to ${isEditMode ? "update" : "create"} community:`,
        error
      );
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
            showDeleteConfirm={showDeleteConfirm}
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
  showDeleteConfirm,
  onClose,
  onSubmit,
  onDelete,
}: {
  isProcessing: boolean;
  showDeleteConfirm: boolean;
  onClose: () => void;
  onSubmit: (
    formData: CreateCommunityData | EditCommunityData,
    resetForm: () => void
  ) => void;
  onDelete: () => void;
}) {
  const formContext = useCommunityForm();
  const { formData, resetForm } = formContext;

  const handleSubmit = () => {
    onSubmit(formData, resetForm);
  };

  return (
    <CommunityActions
      isProcessing={isProcessing}
      showDeleteConfirm={showDeleteConfirm}
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={onDelete}
    />
  );
}

