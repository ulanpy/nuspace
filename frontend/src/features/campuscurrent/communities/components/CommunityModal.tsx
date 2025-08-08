import { useState, useEffect } from "react";
import { Modal } from "@/components/atoms/modal";
import { useCreateCommunity } from "@/features/campuscurrent/communities/hooks/useCreateCommunity";
import { useUpdateCommunity } from "@/features/campuscurrent/communities/hooks/useUpdateCommunity";
import { useDeleteCommunity } from "@/features/campuscurrent/communities/hooks/useDeleteCommunity";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useMediaEditContext } from "@/context/MediaEditContext";
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
import { CommunityDetailsForm } from "@/features/campuscurrent/communities/components/forms/CommunityDetailsForm";
import { CommunityDescription } from "@/features/campuscurrent/communities/components/forms/CommunityDescription";
import { DeleteConfirmation } from "@/components/molecules/DeleteConfirmation";
import { CommunityActions } from "@/features/campuscurrent/communities/components/forms/CommunityActions";
import {
  useCommunityForm,
  CommunityFormProvider,
} from "@/context/CommunityFormContext";

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
  const { setPreviewMedia, setMediaFiles } = useMediaUploadContext();
  const { setOriginalMedia, setMediaToDelete, setCurrentMediaIndex } =
    useMediaEditContext();

  const isProcessing = isCreating || isUpdating || isDeleting;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize media for edit mode
  useEffect(() => {
    if (isEditMode && community && community.media) {
      // Set existing media for preview
      const existingMediaUrls = community.media.map((media) => media.url);
      setPreviewMedia(existingMediaUrls);

      // Set original media for tracking changes
      setOriginalMedia(
        community.media.map((media) => ({
          id: media.id,
          url: media.url,
          order: media.media_order.toString(),
        }))
      );

      // Reset media files for new uploads
      setMediaFiles([]);

      // Reset media to delete
      setMediaToDelete([]);

      // Set current media index
      setCurrentMediaIndex(0);
    } else if (!isEditMode) {
      // Reset all media states for create mode
      setPreviewMedia([]);
      setMediaFiles([]);
      setOriginalMedia([]);
      setMediaToDelete([]);
      setCurrentMediaIndex(0);
    }
  }, [
    isEditMode,
    community,
    setPreviewMedia,
    setMediaFiles,
    setOriginalMedia,
    setMediaToDelete,
    setCurrentMediaIndex,
  ]);

  const handleSubmit = async (
    formData: CreateCommunityData | EditCommunityData,
    resetForm: () => void
  ) => {
    if (!user) return;

    try {
      if (isEditMode && community) {
        // Update existing community
        const editData: EditCommunityData = {
          name: formData.name,
          description: formData.description,
          telegram_url: formData.telegram_url,
          instagram_url: formData.instagram_url,
        };

        await handleUpdate(community.id.toString(), editData);
      } else {
        // Create new community
        const createData: CreateCommunityData = {
          name: formData.name || "",
          type: CommunityType.club,
          category: CommunityCategory.academic,
          recruitment_status: RecruitmentStatus.open,
          head: user.user.sub,
          established: "",
          description: "",
          telegram_url: "",
          instagram_url: "",
        };

        await handleCreate(createData);
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
          <UnifiedCommunityMediaUpload />

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

