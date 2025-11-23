"use client";
import { ProductCreateForm } from "@/features/marketplace/components/product-create-form";
import { useCreateProduct } from "@/features/marketplace/api/hooks/useCreateProduct";
import { useListingState } from "@/context/ListingContext";
import { motion } from "framer-motion";
import { FloatingElements } from "@/components/organisms/animations/FloatingElements";
import { AuthenticationGuard } from "@/features/marketplace/components/auth/AuthenticationGuard";
import { containerVariants, itemVariants } from "@/utils/animationVariants";

export function SellSection() {
    const { handleCreate } = useCreateProduct();
    const { uploadProgress } = useListingState();



    return (
        <div className="relative overflow-hidden">  
                <AuthenticationGuard>
                    <ProductCreateForm
                        handleCreate={handleCreate}
                        uploadProgress={uploadProgress}
                    />
                </AuthenticationGuard>
        </div>
    );
}



