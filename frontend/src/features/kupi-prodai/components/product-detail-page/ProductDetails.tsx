"use client";

import { Badge } from "@/components/atoms/badge";
import { Clock } from "lucide-react";
import { formatDateWithContext, formatRelativeTime } from "@/utils/date-formatter";
import { Product, Status } from "@/features/kupi-prodai/types";
import { ProductPageActions } from "./ProductPageActions";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/atoms/button";

export function ProductDetails({ 
    product, 
    initiateContactWithSeller, 
    isContactLoading, 
    setShowReportModal,
    onEdit,
    onDelete,
    isDeleting,
    currentStatus,
    onToggleStatus,
    isToggling
}: { 
    product: Product, 
    initiateContactWithSeller: () => void, 
    isContactLoading: boolean, 
    setShowReportModal: (show: boolean) => void,
    onEdit?: () => void,
    onDelete?: () => void,
    isDeleting?: boolean,
    currentStatus?: Status,
    onToggleStatus?: () => void,
    isToggling?: boolean
}) {
    const { user, login } = useUser();

    const getConditionDisplay = (condition: string) => {
        switch (condition) {
            case "new": return "New";
            case "like_new": return "Like New";
            case "used": return "Used";
            default: return condition;
        }
    };

    const getConditionColor = (condition: string) => {
        switch (condition) {
            case "new": return "bg-green-500";
            case "like_new": return "bg-blue-500";
            case "used": return "bg-orange-500";
            default: return "bg-gray-500";
        }
    };

    const getCategoryDisplay = (category: string) => {
        return category.charAt(0).toUpperCase() + category.slice(1);
    };

    const formattedCreatedAt = product.created_at
        ? formatDateWithContext(product.created_at)
        : "Unknown date";
    const wasUpdated =
        product.updated_at &&
        product.created_at &&
        new Date(product.updated_at).getTime() >
        new Date(product.created_at).getTime();
    const formattedUpdatedAt =
        wasUpdated && product.updated_at
            ? `Updated ${formatRelativeTime(product.updated_at)}`
            : null;


    return (
        <div className="space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold break-all break-words hyphens-auto w-full overflow-x-hidden">{product.name}</h1>
                    <p className="text-3xl font-bold mt-2">{product.price} ₸</p>
                </div>
                <Badge
                    className={`${getConditionColor(product.condition)} text-white`}
                >
                    {getConditionDisplay(product.condition)}
                </Badge>
            </div>

            <div className="flex flex-col gap-0">
                {user ? (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <img
                                src={product.seller.picture}
                                alt=""
                                className="w-8 h-8 rounded-full"
                            />
                        </div>
                        <div>
                            <p className="font-medium">{`${product.seller.name} ${product.seller.surname}`}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-muted-foreground">Login to connect with the seller.</p>
                    </div>
                )}

                {user && (
                    <ProductPageActions
                        initiateContactWithSeller={initiateContactWithSeller}
                        isContactLoading={isContactLoading}
                        setShowReportModal={setShowReportModal}
                        isContactAllowed={true}
                        permissions={product.permissions}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        isDeleting={isDeleting}
                        currentStatus={currentStatus}
                        onToggleStatus={onToggleStatus}
                        isToggling={isToggling}
                    />
                )}
                {!user && (
                    <ProductPageActions
                        initiateContactWithSeller={initiateContactWithSeller}
                        isContactLoading={isContactLoading}
                        setShowReportModal={setShowReportModal}
                        isContactAllowed={false}
                        onRequireLogin={login}
                        permissions={product.permissions}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        isDeleting={isDeleting}
                        currentStatus={currentStatus}
                        onToggleStatus={onToggleStatus}
                        isToggling={isToggling}
                    />
                )}
            </div>

            {/* Listing Date Information */}
            <div className="flex items-center text-sm text-muted-foreground gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{formattedCreatedAt}</span>
            </div>

            {formattedUpdatedAt && (
                <div className="text-sm text-muted-foreground italic">
                    {formattedUpdatedAt}
                </div>
            )}

            <div className="h-px w-full bg-border my-4" />

            <div>
                <h2 className="font-medium mb-2">Description</h2>
                <p className="text-muted-foreground break-words whitespace-pre-wrap overflow-wrap-anywhere">{product.description}</p>
            </div>

            <div>
                <h2 className="font-medium mb-2">Details</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Category</div>
                    <div>{getCategoryDisplay(product.category)}</div>
                    <div className="text-muted-foreground">Status</div>
                    <div>{product.status === "active" ? "Available" : "Sold"}</div>
                </div>
            </div>
        </div>
    );
} 