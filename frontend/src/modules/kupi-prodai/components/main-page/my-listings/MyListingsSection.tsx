"use client"

import { useUserProducts } from "@/modules/kupi-prodai/api/hooks/useUserProducts";
import { useDeleteProduct } from "@/modules/kupi-prodai/api/hooks/useDeleteProduct";
import { useToggleProduct } from "@/modules/kupi-prodai/api/hooks/useToggleProduct";
import { useEditModal } from "@/modules/kupi-prodai/hooks/useEditModal";
import { ProductListingSection } from "@/modules/kupi-prodai/components/common/ProductListingSection";
import { AuthRequiredAlert } from "@/components/molecules/auth-required-alert";
import { useUser } from "@/hooks/use-user";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";
import { EditListingModal } from "./EditListingModal";
import { Product } from "@/modules/kupi-prodai/types";


export function MyListingsSection() {
    const navigate = useNavigate();
    const { user, login } = useUser();
    const { myProducts } = useUserProducts();
    const { getIsPendingDeleteMutation, handleDelete } = useDeleteProduct();
    const { handleToggleProductStatus, getIsPendingToggleMutation } = useToggleProduct();
    const { handleEditListing } = useEditModal();

    const activeListings = myProducts?.products?.filter((p) => p.status === "active");
    const inactiveListings = myProducts?.products?.filter((p) => p.status === "inactive");

    if (!user) {
        return <AuthRequiredAlert description="view your listings." onClick={() => login()} />;
    }

    return (
        <div className="space-y-6 pt-4">
            <ProductListingSection
                title="Active Listings"
                products={activeListings as Product[] || []}
                emptyMessage="No active listings found."
                onProductClick={(productId) =>
                    navigate(ROUTES.APPS.KUPI_PRODAI.PRODUCT.DETAIL_FN(productId.toString()))
                }
                onEditListing={handleEditListing}
                onDeleteListing={handleDelete}
                onToggleListingStatus={handleToggleProductStatus}
                getIsPendingToggleMutation={getIsPendingToggleMutation}
                getIsPendingDeleteMutation={getIsPendingDeleteMutation}
            />

            <ProductListingSection
                title="Inactive Listings"
                products={inactiveListings as Product[] || []}
                emptyMessage="No inactive listings found."
                onProductClick={(productId) =>
                    navigate(ROUTES.APPS.KUPI_PRODAI.PRODUCT.DETAIL_FN(productId.toString()))
                }
                onEditListing={handleEditListing}
                onDeleteListing={handleDelete}
                onToggleListingStatus={handleToggleProductStatus}
                getIsPendingToggleMutation={getIsPendingToggleMutation}
                getIsPendingDeleteMutation={getIsPendingDeleteMutation}
            />

            <EditListingModal />
        </div>
    );
} 