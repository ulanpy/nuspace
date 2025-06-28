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

  if (isError || !product) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          className="mb-4 flex items-center gap-1"
          onClick={() => navigate("/apps/kupi-prodai")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Marketplace</span>
        </Button>

        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-destructive mb-4">
            {isError || "Product not found"}
          </h2>
          <Button onClick={() => navigate("/apps/kupi-prodai")}>
            Return to Marketplace
          </Button>
        </div>
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
      prevIndex === product.media.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? product.media.length - 1 : prevIndex - 1
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
    <div className="container mx-auto px-4 py-6">
      <Button
        variant="ghost"
        className="mb-4 flex items-center gap-1"
        onClick={() => navigate("/apps/kupi-prodai")}
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Back to Marketplace</span>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Images Carousel */}
        <div className="relative">
          <div
            className="aspect-square rounded-lg overflow-hidden cursor-pointer"
            onClick={openImageModal}
          >
            <img
              src={
                product.media.length > 0
                  ? product.media[currentImageIndex]?.url
                  : getPlaceholderImage(product)
              }
              alt={product.name}
              className="w-full h-full object-contain"
            />
          </div>

          {product.media.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Thumbnail Navigation */}
          {product.media.length > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              {product.media.map((image, index) => (
                <button
                  key={image.id}
                  className={`w-16 h-16 rounded-md overflow-hidden border-2 ${
                    index === currentImageIndex
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img
                    src={
                      image.url || "https://placehold.co/400x400?text=No+Image"
                    }
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <p className="text-3xl font-bold mt-2">{product.price} ₸</p>
            </div>
            <Badge
              className={`${getConditionColor(product.condition)} text-white`}
            >
              {getConditionDisplay(product.condition)}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center">
                  <p className="font-medium">{`${product.user_name} ${
                    product.user_surname?.[0] ?? ""
                  }.`}</p>
                </div>
              </div>
            </div>
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
            <p className="text-muted-foreground">{product.description}</p>
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

          <div className="flex flex-wrap gap-2 mt-6">
            <Button
              variant="outline"
              className="flex items-center gap-1"
              onClick={initiateContactWithSeller}
              disabled={isContactLoading}
            >
              <ExternalLink className="h-4 w-4" />
              <span>
                {isContactLoading ? "Loading..." : "Contact on Telegram"}
              </span>
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-1 text-destructive"
              onClick={() => setShowReportModal(true)}
            >
              <Flag className="h-4 w-4" />
              <span>Report</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Comments Section */}


      {/* Report Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report Listing"
        description="Please explain why you're reporting this listing"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for reporting</label>
            <textarea
              className="w-full p-2 border rounded-md min-h-[100px] bg-background"
              placeholder="Please explain why you're reporting this listing..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReportModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReport}>
              Report
            </Button>
          </div>
        </div>
      </Modal>

      {/* Contact Telegram Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Contact Seller"
        description="Click the button below to contact the seller on Telegram"
      >
        <div className="space-y-4 py-2 flex flex-col items-center">
          <p className="text-sm text-muted-foreground">
            You will be redirected to Telegram to chat with the seller about
            this item
          </p>

          <Button
            className="flex items-center gap-2"
            onClick={() => {
              window.open(telegramLink, "_blank");
              setIsContactModalOpen(false);
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Open in Telegram
          </Button>
        </div>
      </Modal>

      {/* Image Modal with Zoom */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 z-10"
              onClick={() => setShowImageModal(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {product.media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 z-10"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 z-10"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              <Button
                variant="ghost"
                size="sm"
                className="text-white bg-black/50 hover:bg-black/70"
                onClick={() => handleZoom(-0.5)}
              >
                Zoom Out
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white bg-black/50 hover:bg-black/70"
                onClick={() => handleZoom(0.5)}
              >
                Zoom In
              </Button>
            </div>

            <div
              className="w-full h-full flex items-center justify-center overflow-auto"
              style={{ cursor: "move" }}
            >
              <img
                src={
                  product.media.length > 0
                    ? product.media[currentImageIndex]?.url
                    : getPlaceholderImage(product)
                }
                alt={product.name}
                className="max-w-none"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transition: "transform 0.2s ease-out",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}