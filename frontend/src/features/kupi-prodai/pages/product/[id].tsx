"use client";

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/atoms/button";
import { useToast } from "@/hooks/use-toast";
import { useProduct } from "@/features/kupi-prodai/api/hooks/useProduct";
import { Spinner } from "@/components/atoms/spinner";
import { ROUTES } from "@/data/routes";

import { ProductImageCarousel } from "@/features/kupi-prodai/components/product-detail-page/ProductImageCarousel";
import { ProductDetails } from "@/features/kupi-prodai/components/product-detail-page/ProductDetails";
import { ReportListingModal } from "@/features/kupi-prodai/components/product-detail-page/ReportListingModal";
import { ImageViewerModal } from "@/features/kupi-prodai/components/product-detail-page/ImageViewerModal";
import { UnifiedEditListingModal } from "@/features/kupi-prodai/components/main-page/my-listings/UnifiedEditListingModal";
import { useDeleteProduct } from "@/features/kupi-prodai/api/hooks/useDeleteProduct";
import { useToggleProduct } from "@/features/kupi-prodai/api/hooks/useToggleProduct";
import { useEditModal } from "@/features/kupi-prodai/hooks/useEditModal";

export default function ProductDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { product, isLoading, isError } = useProduct();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isContactLoading, setIsContactLoading] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);

    const { toast } = useToast();
    
    // Edit and delete functionality
    const { handleEditListing } = useEditModal();
    const { handleDelete, getIsPendingDeleteMutation } = useDeleteProduct();
    const { handleToggleProductStatus, getIsPendingToggleMutation } = useToggleProduct();
    
    const isDeleting = product ? getIsPendingDeleteMutation(product.id) : false;
    const isToggling = product ? getIsPendingToggleMutation(product.id) : false;

    // Handle edit product
    const handleEdit = () => {
        if (product) {
            handleEditListing(product);
        }
    };

    // Handle delete product
    const handleDeleteProduct = async () => {
        if (product) {
            try {
                await handleDelete(product.id);
                toast({
                    title: "Success",
                    description: "Product deleted successfully",
                });
                // Navigate back to marketplace after successful deletion
                navigate(ROUTES.APPS.KUPI_PRODAI.ROOT);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to delete product. Please try again.",
                    variant: "destructive",
                });
            }
        }
    };

    // Handle toggle status (Mark as Sold/Available)
    const handleToggleStatus = () => {
        if (product) {
            handleToggleProductStatus(product.id, product.status);
        }
    };

    const initiateContactWithSeller = async () => {
        if (!id) return;

        try {
            setIsContactLoading(true);
            const response = await fetch(`/api/contact/${id}`, {
                method: "POST",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to get contact link");
            }

            const telegramUrl = await response.json();
            // Directly open the Telegram link
            window.open(telegramUrl, "_blank");
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate contact link. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsContactLoading(false);
        }
    };

    const nextImage = () => {
        if (!product) return;
        setCurrentImageIndex((prevIndex) =>
            prevIndex === product.media.length - 1 ? 0 : prevIndex + 1,
        );
    };

    const prevImage = () => {
        if (!product) return;
        setCurrentImageIndex((prevIndex) =>
            prevIndex === 0 ? product.media.length - 1 : prevIndex - 1,
        );
    };

    if (isLoading) {
        return <Spinner />;
    }

    if (isError || !product) {
        return (
            <div className="container mx-auto px-4 py-6">

                <div className="text-center py-12">
                    <h2 className="text-xl font-bold text-destructive mb-4">
                        {isError ? "Failed to load product" : "Product not found"}
                    </h2>
                    <Button onClick={() => navigate(ROUTES.APPS.KUPI_PRODAI.ROOT)}>
                        Return to Marketplace
                    </Button>
                </div>
            </div>
        );
    }

    return (
            <div className="container mx-auto px-4 py-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProductImageCarousel
                    productName={product.name}
                    media={product.media}
                    currentImageIndex={currentImageIndex}
                    setCurrentImageIndex={setCurrentImageIndex}
                    openImageModal={() => setShowImageModal(true)}
                    prevImage={prevImage}
                    nextImage={nextImage}
                />
                <div>
                    <ProductDetails 
                        product={product}
                        initiateContactWithSeller={initiateContactWithSeller}
                        isContactLoading={isContactLoading}
                        setShowReportModal={setShowReportModal}
                        onEdit={handleEdit}
                        onDelete={handleDeleteProduct}
                        isDeleting={isDeleting}
                        currentStatus={product.status}
                        onToggleStatus={handleToggleStatus}
                        isToggling={isToggling}
                    />
                </div>
            </div>

            <ReportListingModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                productId={product.id}
            />

            <ImageViewerModal
                isOpen={showImageModal}
                onClose={() => setShowImageModal(false)}
                images={product.media}
                currentImageIndex={currentImageIndex}
                prevImage={prevImage}
                nextImage={nextImage}
                productName={product.name}
            />

            <UnifiedEditListingModal />
        </div>
    );
}
