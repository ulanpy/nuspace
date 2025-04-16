"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Heart, ExternalLink, Bell, Flag, X, Send, MessageSquare, User } from "lucide-react"
import { Button } from "../../../../components/ui/button"
import { Badge } from "../../../../components/ui/badge"
import { Card, CardContent } from "../../../../components/ui/card"
import { useAuth } from "../../../../context/auth-context"
import { format } from "date-fns"
import { kupiProdaiApi, type Product } from "../../../../api/kupi-prodai-api"
import { useToast } from "../../../../hooks/use-toast"
import CommentsSection from "../comment-section"

interface Comment {
  id: number
  user: {
    name: string
    avatar?: string
  }
  text: string
  timestamp: Date
  isOwner?: boolean
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user_name } = useParams<{ user_name: string }>()
  const { user_surname } = useParams<{ user_surname: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [message, setMessage] = useState("")
  const [showImageModal, setShowImageModal] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return

      try {
        setIsLoading(true)
        setError(null)
        const data = await kupiProdaiApi.getProduct(Number.parseInt(id))
        setProduct(data)

        // In a real app, you would fetch comments from an API
        // For now, we'll use empty comments
        setComments([])
      } catch (err) {
        console.error("Failed to fetch product:", err)
        setError("Failed to fetch product details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4 flex items-center gap-1" onClick={() => navigate("/apps/kupi-prodai")}>
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Marketplace</span>
        </Button>

        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-destructive mb-4">{error || "Product not found"}</h2>
          <Button onClick={() => navigate("/apps/kupi-prodai")}>Return to Marketplace</Button>
        </div>
      </div>
    )
  }

  const getConditionDisplay = (condition: string) => {
    switch (condition) {
      case "new":
        return "New"
      case "like_new":
        return "Like New"
      case "used":
        return "Used"
      default:
        return condition
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "new":
        return "bg-green-500"
      case "like_new":
        return "bg-blue-500"
      case "used":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const getCategoryDisplay = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex === product.media.length - 1 ? 0 : prevIndex + 1))
  }

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex === 0 ? product.media.length - 1 : prevIndex - 1))
  }

  const toggleLike = () => {
    setIsLiked(!isLiked)
  }

  const toggleSubscribe = () => {
    setIsSubscribed(!isSubscribed)
  }

  const handleReport = () => {
    if (!reportReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for reporting",
        variant: "destructive",
      })
      return
    }

    // In a real app, you would send the report to an API
    toast({
      title: "Success",
      description: "Report submitted successfully",
    })
    setShowReportModal(false)
    setReportReason("")
  }

  const handleSendMessage = () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      })
      return
    }

    // Add the new comment to the comments array
    const newComment: Comment = {
      id: Date.now(),
      user: {
        name: user?.user?.given_name || "You",
        avatar: "https://placehold.co/100/8b5cf6/FFFFFF?text=YOU",
      },
      text: message,
      timestamp: new Date(),
    }

    setComments([...comments, newComment])
    setMessage("")

    toast({
      title: "Success",
      description: "Message sent successfully",
    })
  }

  const initiateContactWithSeller = () => {
    // In a real app, you would have the seller's Telegram username
    // For now, we'll just show a toast
    toast({
      title: "Contact Seller",
      description: "This would open Telegram to contact the seller",
    })
  }

  const openImageModal = () => {
    setShowImageModal(true)
    setZoomLevel(1)
  }

  const handleZoom = (factor: number) => {
    setZoomLevel((prev) => {
      const newZoom = prev + factor
      return Math.min(Math.max(newZoom, 0.5), 3) // Limit zoom between 0.5x and 3x
    })
  }

  const formatCommentDate = (date: Date) => {
    return format(date, "MMM d, yyyy 'at' h:mm a")
  }

  const getPlaceholderImage = (product: Product) => {
    if (product.media && product.media.length > 0 && product.media[currentImageIndex]?.url) {
      return product.media[currentImageIndex].url
    }
    return (
      "https://placehold.co/400x400?text=No+Image"
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Button variant="ghost" className="mb-4 flex items-center gap-1" onClick={() => navigate("/apps/kupi-prodai")}>
        <ChevronLeft className="h-4 w-4" />
        <span>Back to Marketplace</span>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Images Carousel */}
        <div className="relative">
          <div className="aspect-square rounded-lg overflow-hidden cursor-pointer" onClick={openImageModal}>
            <img
              src={product.media.length > 0 ? product.media[currentImageIndex]?.url : getPlaceholderImage(product)}
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
                  e.stopPropagation()
                  prevImage()
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80"
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
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
                    index === currentImageIndex ? "border-primary" : "border-transparent"
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img
                    src={image.url || "https://placehold.co/400x00"}
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
            <Badge className={`${getConditionColor(product.condition)} text-white`}>
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
                  <p className="font-medium">{`${product.user_name} ${product.user_surname[0]}.`}</p>
                </div>
              </div>
            </div>

            <Button
              variant={isSubscribed ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-1"
              onClick={toggleSubscribe}
            >
              <Bell className="h-4 w-4" />
              <span>{isSubscribed ? "Subscribed" : "Subscribe"}</span>
            </Button>
          </div>

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
            <Button variant="outline" className="flex items-center gap-1" onClick={toggleLike}>
              <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
              <span>{isLiked ? "Liked" : "Like"}</span>
            </Button>

            <Button variant="outline" className="flex items-center gap-1" onClick={() => initiateContactWithSeller()}>
              <ExternalLink className="h-4 w-4" />
              <span>Contact on Telegram</span>
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
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <span>Comments ({comments.length})</span>
        </h2>

        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Add a Comment</h3>
            <div className="space-y-3">
              <textarea
                className="w-full p-2 border rounded-md min-h-[100px] bg-background"
                placeholder="Write your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button className="w-full flex items-center justify-center gap-1" onClick={handleSendMessage}>
                <Send className="h-4 w-4" />
                <span>Send Message</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id} className={comment.isOwner ? "border-primary/30 bg-primary/5" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comment.user.name}</span>
                          {comment.isOwner && (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                              Seller
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCommentDate(comment.timestamp)}</span>
                      </div>
                      <p className="text-sm">{comment.text}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border rounded-md bg-muted/20">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <h3 className="text-lg font-medium mb-1">No comments yet</h3>
            <p className="text-sm text-muted-foreground">Be the first to ask about this item</p>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Report Listing</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowReportModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

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
            </div>
          </div>
        </div>
      )}

      {/* Image Modal with Zoom */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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

            <div className="w-full h-full flex items-center justify-center overflow-auto" style={{ cursor: "move" }}>
              <img
                src={product.media.length > 0 ? product.media[currentImageIndex]?.url : getPlaceholderImage(product)}
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
  )
}
