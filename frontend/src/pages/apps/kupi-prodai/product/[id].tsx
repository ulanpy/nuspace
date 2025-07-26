"use client";

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flag,
  X,
  User,
  Clock,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";

import { useToast } from "@/hooks/use-toast";
import { Modal } from "@/components/atoms/modal";
import {
  formatDateWithContext,
  formatRelativeTime,
} from "@/utils/date-formatter";
import { useUser } from "@/hooks/use-user";
import { useProduct } from "@/modules/kupi-prodai/api/hooks/use-product";
import { Spinner } from "@/components/atoms/spinner";
import { ROUTES } from "@/data/routes";
import { ProductImages } from "@/components/organisms/kp/product-images";
import { ProductInfo } from "@/components/organisms/kp/product-info";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { product, isLoading, isError } = useProduct();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [telegramLink, setTelegramLink] = useState("");
  const [isContactLoading, setIsContactLoading] = useState(false);

  const { toast } = useToast();

  if (isLoading) {
    return <Spinner />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-2xl font-bold mb-4">Product not found</h1>
        <p className="text-gray-600 mb-8">
          The product you are looking for does not exist.
        </p>
        <Button onClick={() => navigate(ROUTES.APPS.KUPI_PRODAI.ROOT)}>
          Go back to products
        </Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Product not found</h1>
        <Button onClick={() => navigate(ROUTES.APPS.KUPI_PRODAI.ROOT)}>
          Go back to products
        </Button>
      </div>
    );
  }

  const getConditionDisplay = (condition: string) => {
    switch (condition) {
      case "new":
        return "New";
      case "like_new":
        return "Like New";
      case "used":
        return "Used";
      default:
        return condition;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "new":
        return "bg-green-500";
      case "like_new":
        return "bg-blue-500";
      case "used":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCategoryDisplay = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === product.media.length - 1 ? 0 : prevIndex + 1,
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? product.media.length - 1 : prevIndex - 1,
    );
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for reporting",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/products/${product.id}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          product_id: product.id,
          text: reportReason,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Report submitted successfully",
        });
        setShowReportModal(false);
        setReportReason("");
      } else {
        throw new Error("Failed to submit report");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
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
      setTelegramLink(telegramUrl);
      setIsContactModalOpen(true);
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

  const openImageModal = () => {
    setShowImageModal(true);
    setZoomLevel(1);
  };

  const handleZoom = (factor: number) => {
    setZoomLevel((prev) => {
      const newZoom = prev + factor;
      return Math.min(Math.max(newZoom, 0.5), 3); // Limit zoom between 0.5x and 3x
    });
  };

  const getPlaceholderImage = (product: Types.Product) => {
    if (
      product.media &&
      product.media.length > 0 &&
      product.media[currentImageIndex]?.url
    ) {
      return product.media[currentImageIndex].url;
    }
    return "https://placehold.co/400x400?text=No+Image";
  };

  // Format the created_at and updated_at dates
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate(ROUTES.APPS.KUPI_PRODAI.ROOT)}
        >
          &larr; Back to Products
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ProductImages images={product.media} />
        <ProductInfo product={product} />
      </div>
    </div>
  );
}
