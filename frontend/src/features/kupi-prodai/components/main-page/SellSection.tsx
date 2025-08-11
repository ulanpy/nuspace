"use client";
import { ProductCreateForm } from "@/features/kupi-prodai/components/product-create-form";
import { useCreateProduct } from "@/features/kupi-prodai/api/hooks/useCreateProduct";
import { useListingState } from "@/context/ListingContext";
import { motion } from "framer-motion";
import { FloatingElements } from "@/components/organisms/animations/FloatingElements";
import { AuthenticationGuard } from "@/features/kupi-prodai/components/auth/AuthenticationGuard";
import { containerVariants, itemVariants } from "@/utils/animationVariants";

export function SellSection() {
    const { handleCreate } = useCreateProduct();
    const { uploadProgress } = useListingState();



    return (
        <div className="relative overflow-hidden">
            <FloatingElements />
            
            <motion.div 
                className="relative space-y-6 pt-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants}>
                    <AuthenticationGuard>
                        <ProductCreateForm
                            handleCreate={handleCreate}
                            uploadProgress={uploadProgress}
                        />
                    </AuthenticationGuard>
                </motion.div>
            </motion.div>
        </div>
    );
}



