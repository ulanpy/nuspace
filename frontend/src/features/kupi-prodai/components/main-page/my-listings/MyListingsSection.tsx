"use client"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { EmptyState } from "@/features/kupi-prodai/components/main-page/my-listings/EmptyState";
import { Archive, PlusCircle } from "lucide-react";


export function MyListingsSection() {
    const navigate = useNavigate();
    const { setActiveTab } = useListingState();
    const { myProducts } = useUserProducts();
    const { getIsPendingDeleteMutation, handleDelete } = useDeleteProduct();
    const { handleToggleProductStatus, getIsPendingToggleMutation } = useToggleProduct();
    const { handleEditListing } = useEditModal();

    const activeListings = myProducts?.products?.filter((p) => p.status === "active");
    const inactiveListings = myProducts?.products?.filter((p) => p.status === "inactive");


    return (
        <div className="space-y-6 pt-4">
            <Tabs defaultValue="active-listings">
                <TabsList>
                    <TabsTrigger value="active-listings">Active Listings</TabsTrigger>
                    <TabsTrigger value="inactive-listings">Inactive Listings</TabsTrigger>
                </TabsList>

                <TabsContent value="active-listings">
                    <ProductListingSection
                        products={activeListings as Product[] || []}
                        emptyMessage={<EmptyState 
                            icon={<PlusCircle />}
                            title="No active listings"
                            description="Oops! You have no active listings at the moment. Create a new listing to get started."
                            buttonText="Create a new listing"
                            onButtonClick={() => setActiveTab("sell")}
                        />}
                        onProductClick={(productId) =>
                            navigate(ROUTES.APPS.KUPI_PRODAI.PRODUCT.DETAIL_FN(productId.toString()))
                        }
                        onEditListing={handleEditListing}
                        onDeleteListing={handleDelete}
                        onToggleListingStatus={handleToggleProductStatus}
                        getIsPendingToggleMutation={getIsPendingToggleMutation}
                        getIsPendingDeleteMutation={getIsPendingDeleteMutation}
                    />
                </TabsContent>

                <TabsContent value="inactive-listings">
                    <ProductListingSection
                        products={inactiveListings as Product[] || []}
                        emptyMessage={<EmptyState 
                            icon={<Archive />}
                            title="No inactive listings"
                            description="Inactive listings are not visible to other users."
                        />}
                        onProductClick={(productId) =>
                            navigate(ROUTES.APPS.KUPI_PRODAI.PRODUCT.DETAIL_FN(productId.toString()))
                        }
                        onEditListing={handleEditListing}
                        onDeleteListing={handleDelete}
                        onToggleListingStatus={handleToggleProductStatus}
                        getIsPendingToggleMutation={getIsPendingToggleMutation}
                        getIsPendingDeleteMutation={getIsPendingDeleteMutation}
                    />
                </TabsContent>
            </Tabs>
            <UnifiedEditListingModal />
        </div>
    );
}
