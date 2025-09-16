"use client"

import { useState } from "react";
import { useUserProducts } from "@/features/kupi-prodai/api/hooks/useUserProducts";
import { useDeleteProduct } from "@/features/kupi-prodai/api/hooks/useDeleteProduct";
import { useToggleProduct } from "@/features/kupi-prodai/api/hooks/useToggleProduct";
import { useEditModal } from "@/features/kupi-prodai/hooks/useEditModal";
import { ProductListingSection } from "@/features/kupi-prodai/components/common/ProductListingSection";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";
import { useListingState } from "@/context/ListingContext";
import { UnifiedEditListingModal } from "./UnifiedEditListingModal";
import { Product } from "@/features/kupi-prodai/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { EmptyState } from "@/features/kupi-prodai/components/main-page/my-listings/EmptyState";
import { Archive, PlusCircle } from "lucide-react";


export function MyListingsSection() {
    const navigate = useNavigate();
    const { setActiveTab } = useListingState();
    const { myProducts } = useUserProducts();
    const { getIsPendingDeleteMutation, handleDelete } = useDeleteProduct();
    const { handleToggleProductStatus, getIsPendingToggleMutation } = useToggleProduct();
    const { handleEditListing } = useEditModal();
    
    const [selectedListingType, setSelectedListingType] = useState<"active" | "inactive">("active");

    const activeListings = myProducts?.products?.filter((p) => p.status === "active");
    const inactiveListings = myProducts?.products?.filter((p) => p.status === "inactive");


    const currentListings = selectedListingType === "active" ? activeListings : inactiveListings;
    const currentEmptyMessage = selectedListingType === "active" ? (
        <EmptyState 
            icon={<PlusCircle />}
            title="No active listings"
            description="Oops! You have no active listings at the moment. Create a new listing to get started."
            buttonText="Create a new listing"
            onButtonClick={() => setActiveTab("sell")}
        />
    ) : (
        <EmptyState 
            icon={<Archive />}
            title="No inactive listings"
            description="Inactive listings are not visible to other users."
        />
    );

    return (
        <div className="space-y-6 pt-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">My Listings</h2>
                <Select value={selectedListingType} onValueChange={(value: "active" | "inactive") => setSelectedListingType(value)}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select listing type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="active">Active Listings</SelectItem>
                        <SelectItem value="inactive">Inactive Listings</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <ProductListingSection
                products={currentListings as Product[] || []}
                emptyMessage={currentEmptyMessage}
                onProductClick={(productId) =>
                    navigate(ROUTES.APPS.KUPI_PRODAI.PRODUCT.DETAIL_FN(productId.toString()))
                }
                onEditListing={handleEditListing}
                onDeleteListing={handleDelete}
                onToggleListingStatus={handleToggleProductStatus}
                getIsPendingToggleMutation={getIsPendingToggleMutation}
                getIsPendingDeleteMutation={getIsPendingDeleteMutation}
            />
            
            <UnifiedEditListingModal />
        </div>
    );
}
