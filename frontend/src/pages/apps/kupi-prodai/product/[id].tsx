"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Heart, ExternalLink, Star, Bell, Flag, X, Send } from "lucide-react"
import { Button } from "../../../../components/ui/button"
import { Badge } from "../../../../components/ui/badge"
import { Card, CardContent } from "../../../../components/ui/card"

interface ProductImage {
  id: number
  url: string
}

interface Product {
  id: number
  title: string
  price: number
  category: string
  condition: "New" | "Used" | "Like New"
  images: ProductImage[]
  seller: string
  sellerRating?: number
  location: string
  likes: number
  messages: number
  description?: string
  telegramUsername?: string
  datePosted?: string
  isOwner?: boolean
  isSold?: boolean
}

// Sample products data with multiple images (same as in the main page)
const products: Product[] = [
  {
    id: 1,
    title: "Calculus Textbook",
    price: 5000,
    category: "Books",
    condition: "Used",
    images: [
      { id: 1, url: "https://placehold.co/400x400/3b82f6/FFFFFF?text=Calculus+1" },
      { id: 2, url: "https://placehold.co/400x400/3b82f6/FFFFFF?text=Calculus+2" },
      { id: 3, url: "https://placehold.co/400x400/3b82f6/FFFFFF?text=Calculus+3" },
    ],
    seller: "Alex K.",
    sellerRating: 4.8,
    location: "Block 1A",
    likes: 5,
    messages: 2,
    description:
      "Slightly used calculus textbook for Math 101. Some highlighting inside but otherwise in good condition.",
    telegramUsername: "alex_k",
    datePosted: "2 days ago",
  },
  {
    id: 2,
    title: "Desk Lamp",
    price: 3500,
    category: "Home",
    condition: "Like New",
    images: [
      { id: 1, url: "https://placehold.co/400x400/22c55e/FFFFFF?text=Lamp+1" },
      { id: 2, url: "https://placehold.co/400x400/22c55e/FFFFFF?text=Lamp+2" },
    ],
    seller: "Maria S.",
    sellerRating: 4.2,
    location: "Block 3C",
    likes: 3,
    messages: 1,
    description: "Modern LED desk lamp with adjustable brightness. Used for one semester only.",
    telegramUsername: "maria_s",
    datePosted: "1 week ago",
  },
  // Add more products as needed
]

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [message, setMessage] = useState("")
  const [showImageModal, setShowImageModal] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  useEffect(() => {
    // In a real app, you would fetch the product from an API
    const foundProduct = products.find((p) => p.id === Number(id))
    if (foundProduct) {
      setProduct(foundProduct)
    } else {
      // Product not found, redirect to marketplace
      navigate("/apps/kupi-prodai")
    }
  }, [id, navigate])

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  const getConditionColor = (condition: Product["condition"]) => {
    switch (condition) {
      case "New":
        return "bg-green-500"
      case "Like New":
        return "bg-blue-500"
      case "Used":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex === product.images.length - 1 ? 0 : prevIndex + 1))
  }

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex === 0 ? product.images.length - 1 : prevIndex - 1))
  }

  const toggleLike = () => {
    setIsLiked(!isLiked)
  }

  const toggleSubscribe = () => {
    setIsSubscribed(!isSubscribed)
  }

  const handleReport = () => {
    if (!reportReason.trim()) {
      alert("Please provide a reason for reporting")
      return
    }

    alert(`Report submitted: ${reportReason}`)
    setShowReportModal(false)
    setReportReason("")
  }

  const handleSendMessage = () => {
    if (!message.trim()) {
      alert("Please enter a message")
      return
    }

    alert(`Message sent to ${product.seller}: ${message}`)
    setMessage("")
  }

  const initiateContactWithSeller = () => {
    if (product.telegramUsername) {
      window.open(`https://t.me/${product.telegramUsername}`, "_blank")
    }
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
              src={product.images[currentImageIndex]?.url || "/placeholder.svg"}
              alt={product.title}
              className="w-full h-full object-contain"
            />
          </div>

          {product.images.length > 1 && (
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
          {product.images.length > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  className={`w-16 h-16 rounded-md overflow-hidden border-2 ${
                    index === currentImageIndex ? "border-primary" : "border-transparent"
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img
                    src={image.url || "/placeholder.svg"}
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
              <h1 className="text-2xl font-bold">{product.title}</h1>
              <p className="text-3xl font-bold mt-2">{product.price} ₸</p>
            </div>
            <Badge className={`${getConditionColor(product.condition)} text-white`}>{product.condition}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                {product.seller.charAt(0)}
              </div>
              <div>
                <div className="flex items-center">
                  <p className="font-medium">{product.seller}</p>
                  {product.sellerRating && (
                    <div className="flex items-center ml-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="ml-1">{product.sellerRating}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{product.location}</p>
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
              <div>{product.category}</div>
              <div className="text-muted-foreground">Posted</div>
              <div>{product.datePosted || "Recently"}</div>
              <div className="text-muted-foreground">Location</div>
              <div>{product.location}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            <Button variant="outline" className="flex items-center gap-1" onClick={toggleLike}>
              <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
              <span>{isLiked ? product.likes + 1 : product.likes}</span>
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

          <Card className="mt-4">
            <CardContent className="p-4">
              <h2 className="font-medium mb-3">Send Message</h2>
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
        </div>
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

            {product.images.length > 1 && (
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
                src={product.images[currentImageIndex]?.url || "/placeholder.svg"}
                alt={product.title}
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



