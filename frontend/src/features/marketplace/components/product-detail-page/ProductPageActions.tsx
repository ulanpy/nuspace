"use client";

import { Button } from "@/components/atoms/button";
import { ExternalLink, Flag, Pencil, Trash2, CheckCircle } from "lucide-react";
import { Permission, Status } from "@/features/marketplace/types";

interface ProductPageActionsProps {
    initiateContactWithSeller: () => void;
    isContactLoading: boolean;
    setShowReportModal: (show: boolean) => void;
    isContactAllowed?: boolean;
    onRequireLogin?: () => void;
    permissions?: Permission;
    onEdit?: () => void;
    onDelete?: () => void;
    isDeleting?: boolean;
    // Toggle status (owner only)
    currentStatus?: Status;
    onToggleStatus?: () => void;
    isToggling?: boolean;
}

export function ProductPageActions({
    initiateContactWithSeller,
    isContactLoading,
    setShowReportModal,
    isContactAllowed = true,
    onRequireLogin,
    permissions,
    onEdit,
    onDelete,
    isDeleting = false,
    currentStatus,
    onToggleStatus,
    isToggling = false,
}: ProductPageActionsProps) {
    return (
        <div className="flex flex-wrap gap-2 mt-6">
            {/* Contact Button - only show if user doesn't have edit permissions (not their own product) */}
            {!permissions?.can_edit && (
                <Button
                    variant="outline"
                    className="flex items-center gap-1"
                    onClick={() => {
                        if (isContactAllowed) {
                            initiateContactWithSeller();
                        } else if (onRequireLogin) {
                            onRequireLogin();
                        }
                    }}
                    disabled={isContactAllowed ? isContactLoading : false}
                >
                    <ExternalLink className="h-4 w-4" />
                    <span>{
                        isContactAllowed
                            ? (isContactLoading ? "Loading..." : "Contact on Telegram")
                            : "Login to contact the seller"
                    }</span>
                </Button>
            )}

            {/* Edit Button - show if user can edit */}
            {permissions?.can_edit && onEdit && (
                <Button
                    variant="outline"
                    className="flex items-center gap-1"
                    onClick={onEdit}
                >
                    <Pencil className="h-4 w-4" />
                    <span>Edit Product</span>
                </Button>
            )}

            {/* Toggle Status Button - show if user can edit */}
            {permissions?.can_edit && onToggleStatus && currentStatus && (
                <Button
                    variant="outline"
                    className="flex items-center gap-1"
                    onClick={onToggleStatus}
                    disabled={isToggling}
                >
                    <CheckCircle className="h-4 w-4" />
                    <span>
                        {isToggling
                            ? "Updating..."
                            : currentStatus === "active" ? "Mark as Sold" : "Mark as Available"}
                    </span>
                </Button>
            )}

            {/* Delete Button - show if user can delete */}
            {permissions?.can_delete && onDelete && (
                <Button
                    variant="outline"
                    className="flex items-center gap-1 text-destructive"
                    onClick={onDelete}
                    disabled={isDeleting}
                >
                    <Trash2 className="h-4 w-4" />
                    <span>{isDeleting ? "Deleting..." : "Delete Product"}</span>
                </Button>
            )}

            {/* Report Button - always show for non-owners */}
            {!permissions?.can_edit && (
                <Button
                    variant="outline"
                    className="flex items-center gap-1 text-destructive"
                    onClick={() => setShowReportModal(true)}
                >
                    <Flag className="h-4 w-4" />
                    <span>Report</span>
                </Button>
            )}
        </div>
    );
} 