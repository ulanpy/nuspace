"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Filter,
  ShoppingBag,
  Heart,
  MessageSquare,
  X,
  Camera,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { useNavigate } from "react-router-dom"

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

// Sample products data with multiple images
const initialProducts: Product[] = [
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
  {
    id: 3,
    title: "Scientific Calculator",
    price: 8000,
    category: "Electronics",
    condition: "New",
    images: [{ id: 1, url: "https://placehold.co/400x400/f97316/FFFFFF?text=Calculator" }],
    seller: "Timur A.",
    sellerRating: 5.0,
    location: "Block 2B",
    likes: 7,
    messages: 4,
    description: "Brand new scientific calculator, still in original packaging. Perfect for engineering courses.",
    telegramUsername: "timur_a",
    datePosted: "3 days ago",
  },
  {
    id: 4,
    title: "Winter Jacket",
    price: 12000,
    category: "Clothing",
    condition: "Used",
    images: [
      { id: 1, url: "https://placehold.co/400x400/ef4444/FFFFFF?text=Jacket+Front" },
      { id: 2, url: "https://placehold.co/400x400/ef4444/FFFFFF?text=Jacket+Back" },
    ],
    seller: "Aisha N.",
    sellerRating: 4.5,
    location: "Block 4A",
    likes: 2,
    messages: 0,
    description: "Warm winter jacket, size M. Used for one winter season, still in good condition.",
    telegramUsername: "aisha_n",
    datePosted: "5 days ago",
  },
  {
    id: 5,
    title: "Wireless Headphones",
    price: 15000,
    category: "Electronics",
    condition: "Like New",
    images: [
      { id: 1, url: "https://placehold.co/400x400/8b5cf6/FFFFFF?text=Headphones+1" },
      { id: 2, url: "https://placehold.co/400x400/8b5cf6/FFFFFF?text=Headphones+2" },
      { id: 3, url: "https://placehold.co/400x400/8b5cf6/FFFFFF?text=Headphones+3" },
    ],
    seller: "Ruslan M.",
    sellerRating: 4.7,
    location: "Block 1C",
    likes: 9,
    messages: 3,
    description: "High-quality wireless headphones with noise cancellation. Used for a few months, works perfectly.",
    telegramUsername: "ruslan_m",
    datePosted: "1 day ago",
  },
  {
    id: 6,
    title: "Physics Notes",
    price: 2000,
    category: "Books",
    condition: "Used",
    images: [{ id: 1, url: "https://placehold.co/400x400/ec4899/FFFFFF?text=Physics+Notes" }],
    seller: "Dana K.",
    sellerRating: 4.0,
    location: "Block 3B",
    likes: 4,
    messages: 2,
    description: "Comprehensive physics notes for PHY201. Includes all formulas and example problems.",
    telegramUsername: "dana_k",
    datePosted: "2 weeks ago",
  },
  {
    id: 7,
    title: "Laptop Stand",
    price: 4000,
    category: "Electronics",
    condition: "New",
    images: [{ id: 1, url: "https://placehold.co/400x400/3b82f6/FFFFFF?text=Laptop+Stand" }],
    seller: "Kanat B.",
    sellerRating: 4.9,
    location: "Block 2A",
    likes: 6,
    messages: 3,
    description: "Adjustable laptop stand, perfect for online classes. Brand new in box.",
    telegramUsername: "kanat_b",
    datePosted: "4 days ago",
  },
  {
    id: 8,
    title: "Chemistry Textbook",
    price: 4500,
    category: "Books",
    condition: "Like New",
    images: [{ id: 1, url: "https://placehold.co/400x400/22c55e/FFFFFF?text=Chemistry" }],
    seller: "Alina M.",
    sellerRating: 4.3,
    location: "Block 1B",
    likes: 2,
    messages: 1,
    description: "Chemistry textbook for CHEM101, barely used. Like new condition.",
    telegramUsername: "alina_m",
    datePosted: "1 week ago",
  },
]

// Sample user's listings
const initialMyListings: Product[] = [
  {
    id: 101,
    title: "Programming Textbook",
    price: 4500,
    category: "Books",
    condition: "Like New",
    images: [{ id: 1, url: "https://placehold.co/400x400/3b82f6/FFFFFF?text=Programming" }],
    seller: "You",
    location: "Block 2A",
    likes: 2,
    messages: 1,
    description: "Introduction to Programming textbook. Used for one semester, like new condition.",
    isOwner: true,
    datePosted: "1 week ago",
  },
  {
    id: 102,
    title: "Desk Organizer",
    price: 1500,
    category: "Home",
    condition: "New",
    images: [{ id: 1, url: "https://placehold.co/400x400/22c55e/FFFFFF?text=Organizer" }],
    seller: "You",
    location: "Block 2A",
    likes: 0,
    messages: 0,
    description: "New desk organizer, still in packaging. Decided I don't need it.",
    isOwner: true,
    datePosted: "3 days ago",
  },
  {
    id: 103,
    title: "Math Notes",
    price: 1000,
    category: "Books",
    condition: "Used",
    images: [{ id: 1, url: "https://placehold.co/400x400/ef4444/FFFFFF?text=Math+Notes" }],
    seller: "You",
    location: "Block 2A",
    likes: 1,
    messages: 0,
    description: "Detailed notes from Math 201. Very helpful for exams.",
    isOwner: true,
    isSold: true,
    datePosted: "2 weeks ago",
  },
]

const categories = ["All Categories", "Books", "Electronics", "Clothing", "Home", "Sports", "Other"]

const locations = [
  "All Locations",
  "Block 1A",
  "Block 1B",
  "Block 1C",
  "Block 2A",
  "Block 2B",
  "Block 2C",
  "Block 3A",
  "Block 3B",
  "Block 3C",
  "Block 4A",
  "Block 4B",
  "Block 4C",
  "Main Building",
  "Library",
  "Sports Center",
]

const conditions = ["All Conditions", "New", "Like New", "Used"]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
}

export default function KupiProdaiPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("buy")
  const [likedProducts, setLikedProducts] = useState<number[]>([])
  const [subscribedSellers, setSubscribedSellers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedCondition, setSelectedCondition] = useState("All Conditions")
  const [showFilters, setShowFilters] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)

  // Products state (for CRUD operations)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [myListings, setMyListings] = useState<Product[]>(initialMyListings)

  // New listing form state
  const [newListing, setNewListing] = useState({
    title: "",
    price: "",
    category: "",
    condition: "",
    location: "",
    description: "",
    telegramUsername: "",
  })
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit listing state
  const [editingListing, setEditingListing] = useState<Product | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const toggleLike = (id: number) => {
    if (likedProducts.includes(id)) {
      setLikedProducts(likedProducts.filter((productId) => productId !== id))
    } else {
      setLikedProducts([...likedProducts, id])
    }
  }

  const toggleSubscribe = (seller: string) => {
    if (subscribedSellers.includes(seller)) {
      setSubscribedSellers(subscribedSellers.filter((s) => s !== seller))
    } else {
      setSubscribedSellers([...subscribedSellers, seller])
    }
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newPreviewImages = [...previewImages]

      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          newPreviewImages.push(reader.result as string)
          setPreviewImages([...newPreviewImages])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeImage = (index: number) => {
    const newPreviewImages = [...previewImages]
    newPreviewImages.splice(index, 1)
    setPreviewImages(newPreviewImages)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewListing((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewListing((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmitListing = (e: React.FormEvent) => {
    e.preventDefault()

    if (previewImages.length === 0) {
      alert("Please upload at least one image")
      return
    }

    // Create new product
    const newProduct: Product = {
      id: Date.now(), // Use timestamp as ID
      title: newListing.title,
      price: Number(newListing.price),
      category: newListing.category,
      condition: newListing.condition as "New" | "Used" | "Like New",
      images: previewImages.map((url, index) => ({ id: index + 1, url })),
      seller: "You",
      location: newListing.location,
      likes: 0,
      messages: 0,
      description: newListing.description,
      telegramUsername: newListing.telegramUsername,
      datePosted: "Just now",
      isOwner: true,
    }

    // Add to my listings
    setMyListings([newProduct, ...myListings])

    // Reset form
    setNewListing({
      title: "",
      price: "",
      category: "",
      condition: "",
      location: "",
      description: "",
      telegramUsername: "",
    })
    setPreviewImages([])
    setActiveTab("my-listings")

    alert("Listing created successfully!")
  }

  const handleEditListing = (product: Product) => {
    setEditingListing(product)
    setNewListing({
      title: product.title,
      price: product.price.toString(),
      category: product.category,
      condition: product.condition,
      location: product.location,
      description: product.description || "",
      telegramUsername: product.telegramUsername || "",
    })
    setPreviewImages(product.images.map((img) => img.url))
    setShowEditModal(true)
  }

  const handleUpdateListing = (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingListing) return

    // Update the listing
    const updatedListing: Product = {
      ...editingListing,
      title: newListing.title,
      price: Number(newListing.price),
      category: newListing.category,
      condition: newListing.condition as "New" | "Used" | "Like New",
      images: previewImages.map((url, index) => ({ id: index + 1, url })),
      location: newListing.location,
      description: newListing.description,
      telegramUsername: newListing.telegramUsername,
    }

    // Update in my listings
    setMyListings(myListings.map((listing) => (listing.id === editingListing.id ? updatedListing : listing)))

    // Reset form and close modal
    setEditingListing(null)
    setNewListing({
      title: "",
      price: "",
      category: "",
      condition: "",
      location: "",
      description: "",
      telegramUsername: "",
    })
    setPreviewImages([])
    setShowEditModal(false)

    alert("Listing updated successfully!")
  }

  const handleDeleteListing = (id: number) => {
    if (window.confirm("Are you sure you want to delete this listing?")) {
      setMyListings(myListings.filter((listing) => listing.id !== id))
    }
  }

  const handleMarkAsSold = (id: number) => {
    setMyListings(myListings.map((listing) => (listing.id === id ? { ...listing, isSold: true } : listing)))
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      searchQuery === "" ||
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === "All Categories" || product.category === selectedCategory
    const matchesCondition = selectedCondition === "All Conditions" || product.condition === selectedCondition

    return matchesSearch && matchesCategory && matchesCondition
  })

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  // Active and sold listings
  const activeListings = myListings.filter((listing) => !listing.isSold)
  const soldListings = myListings.filter((listing) => listing.isSold)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Kupi&Prodai</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Buy and sell items within the university community</p>
      </div>

      <Tabs defaultValue="buy" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="buy">Buy</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
        </TabsList>

        {/* BUY SECTION */}
        <TabsContent value="buy" className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex gap-2 sm:size-default"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>

          {/* Simple Filter UI */}
          {showFilters && (
            <div className="p-4 border rounded-md bg-background space-y-3">
              <div className="space-y-1">
                <label htmlFor="category" className="text-sm font-medium">
                  Category
                </label>
                <select
                  id="category"
                  className="w-full p-2 border rounded-md bg-background"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="condition" className="text-sm font-medium">
                  Condition
                </label>
                <select
                  id="condition"
                  className="w-full p-2 border rounded-md bg-background"
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                >
                  {conditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("All Categories")
                    setSelectedCondition("All Conditions")
                  }}
                >
                  Reset
                </Button>
                <Button size="sm" onClick={() => setShowFilters(false)}>
                  Apply
                </Button>
              </div>
            </div>
          )}

          {currentItems.length > 0 ? (
            <>
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {currentItems.map((product) => (
                  <motion.div key={product.id} variants={itemVariants}>
                    <Card
                      className="overflow-hidden h-full cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/apps/kupi-prodai/product/${product.id}`)}
                    >
                      <div className="aspect-square relative">
                        <img
                          src={product.images[0]?.url || "/placeholder.svg"}
                          alt={product.title}
                          className="object-cover w-full h-full"
                        />
                        <Badge
                          className={`absolute top-2 right-2 ${getConditionColor(product.condition)} text-white text-xs`}
                        >
                          {product.condition}
                        </Badge>
                      </div>
                      <CardContent className="p-2 sm:p-3">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h3 className="font-medium text-xs sm:text-sm line-clamp-1">{product.title}</h3>
                            <p className="text-sm sm:text-base font-bold">{product.price} ₸</p>
                          </div>
                        </div>
                        <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground mb-1">
                          <div className="flex items-center">
                            <span>{product.seller}</span>
                            {product.sellerRating && (
                              <div className="flex items-center ml-1">
                                <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                                <span className="ml-0.5">{product.sellerRating}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex gap-1 text-muted-foreground hover:text-foreground h-6 px-1.5"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleLike(product.id)
                            }}
                          >
                            <Heart
                              className={`h-3 w-3 ${likedProducts.includes(product.id) ? "fill-red-500 text-red-500" : ""}`}
                            />
                            <span className="text-[10px]">
                              {likedProducts.includes(product.id) ? product.likes + 1 : product.likes}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex gap-1 text-muted-foreground hover:text-foreground h-6 px-1.5"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/apps/kupi-prodai/product/${product.id}`)
                            }}
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span className="text-[10px]">{product.messages}</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-4 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i + 1}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => paginate(i + 1)}
                      className="w-8 h-8 p-0"
                    >
                      {i + 1}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No items found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Try adjusting your search or filters to find what you're looking for.
              </p>
            </div>
          )}
        </TabsContent>

        {/* SELL SECTION */}
        <TabsContent value="sell" className="pt-3 sm:pt-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4">Create a New Listing</h2>
              <form onSubmit={handleSubmitListing} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Title
                  </label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="What are you selling?"
                    value={newListing.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="price" className="text-sm font-medium">
                      Price (₸)
                    </label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      placeholder="0"
                      value={newListing.price}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="category" className="text-sm font-medium">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      className="w-full p-2 border rounded-md bg-background"
                      value={newListing.category}
                      onChange={handleSelectChange}
                      required
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {categories.slice(1).map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="condition" className="text-sm font-medium">
                      Condition
                    </label>
                    <select
                      id="condition"
                      name="condition"
                      className="w-full p-2 border rounded-md bg-background"
                      value={newListing.condition}
                      onChange={handleSelectChange}
                      required
                    >
                      <option value="" disabled>
                        Select condition
                      </option>
                      {conditions.slice(1).map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="location" className="text-sm font-medium">
                      Location
                    </label>
                    <select
                      id="location"
                      name="location"
                      className="w-full p-2 border rounded-md bg-background"
                      value={newListing.location}
                      onChange={handleSelectChange}
                      required
                    >
                      <option value="" disabled>
                        Select location
                      </option>
                      {locations.slice(1).map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Describe your item in detail"
                    className="w-full min-h-[100px] p-2 border rounded-md bg-background"
                    value={newListing.description}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="telegramUsername" className="text-sm font-medium">
                    Telegram Username (for contact)
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                      @
                    </span>
                    <Input
                      id="telegramUsername"
                      name="telegramUsername"
                      placeholder="your_username"
                      className="rounded-l-none"
                      value={newListing.telegramUsername}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload Images</label>
                  <div className="border-2 border-dashed border-input rounded-md p-4">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {previewImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image || "/placeholder.svg"}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-5 w-5"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {previewImages.length < 5 && (
                      <div
                        className="flex flex-col items-center justify-center py-4 cursor-pointer border border-dashed border-input rounded-md"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium mb-1">Upload images</p>
                        <p className="text-xs text-muted-foreground">Click to browse or drag and drop</p>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">You can upload up to 5 images</p>
                </div>

                <Button type="submit" className="w-full">
                  Create Listing
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MY LISTINGS SECTION */}
        <TabsContent value="my-listings" className="pt-3 sm:pt-4">
          <Tabs defaultValue="active">
            <TabsList className="w-full">
              <TabsTrigger value="active" className="flex-1">
                Active Listings ({activeListings.length})
              </TabsTrigger>
              <TabsTrigger value="sold" className="flex-1">
                Sold Items ({soldListings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="pt-4">
              {activeListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {activeListings.map((product) => (
                    <Card key={product.id} className="overflow-hidden h-full">
                      <div className="aspect-square relative">
                        <img
                          src={product.images[0]?.url || "/placeholder.svg"}
                          alt={product.title}
                          className="object-cover w-full h-full"
                        />
                        <Badge
                          className={`absolute top-2 right-2 ${getConditionColor(product.condition)} text-white text-xs`}
                        >
                          {product.condition}
                        </Badge>
                      </div>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex justify-between items-start mb-1 sm:mb-2">
                          <div>
                            <h3 className="font-medium text-sm sm:text-base">{product.title}</h3>
                            <p className="text-base sm:text-lg font-bold">{product.price} ₸</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-2">
                          <span>Posted {product.datePosted}</span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-3">
                          <span>{product.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              <span>{product.likes}</span>
                            </Badge>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{product.messages}</span>
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditListing(product)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteListing(product.id)}
                            >
                              Delete
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleMarkAsSold(product.id)}>
                              Mark as Sold
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active listings</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">
                    You don't have any active listings. Create a new listing to start selling.
                  </p>
                  <Button onClick={() => setActiveTab("sell")}>Create Listing</Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sold" className="pt-4">
              {soldListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {soldListings.map((product) => (
                    <Card key={product.id} className="overflow-hidden h-full opacity-75">
                      <div className="aspect-square relative">
                        <img
                          src={product.images[0]?.url || "/placeholder.svg"}
                          alt={product.title}
                          className="object-cover w-full h-full"
                        />
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                          <Badge className="bg-green-500 text-white text-sm px-3 py-1">SOLD</Badge>
                        </div>
                      </div>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex justify-between items-start mb-1 sm:mb-2">
                          <div>
                            <h3 className="font-medium text-sm sm:text-base">{product.title}</h3>
                            <p className="text-base sm:text-lg font-bold">{product.price} ₸</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-2">
                          <span>Posted {product.datePosted}</span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-3">
                          <span>{product.location}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No sold items</h3>
                  <p className="text-sm text-muted-foreground max-w-md">Items you've sold will appear here.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Edit Listing Modal */}
      {showEditModal && editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Edit Listing</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingListing(null)
                    setPreviewImages([])
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <form onSubmit={handleUpdateListing} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="edit-title" className="text-sm font-medium">
                    Title
                  </label>
                  <Input
                    id="edit-title"
                    name="title"
                    placeholder="What are you selling?"
                    value={newListing.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="edit-price" className="text-sm font-medium">
                      Price (₸)
                    </label>
                    <Input
                      id="edit-price"
                      name="price"
                      type="number"
                      placeholder="0"
                      value={newListing.price}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="edit-category" className="text-sm font-medium">
                      Category
                    </label>
                    <select
                      id="edit-category"
                      name="category"
                      className="w-full p-2 border rounded-md bg-background"
                      value={newListing.category}
                      onChange={handleSelectChange}
                      required
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {categories.slice(1).map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="edit-condition" className="text-sm font-medium">
                      Condition
                    </label>
                    <select
                      id="edit-condition"
                      name="condition"
                      className="w-full p-2 border rounded-md bg-background"
                      value={newListing.condition}
                      onChange={handleSelectChange}
                      required
                    >
                      <option value="" disabled>
                        Select condition
                      </option>
                      {conditions.slice(1).map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="edit-location" className="text-sm font-medium">
                      Location
                    </label>
                    <select
                      id="edit-location"
                      name="location"
                      className="w-full p-2 border rounded-md bg-background"
                      value={newListing.location}
                      onChange={handleSelectChange}
                      required
                    >
                      <option value="" disabled>
                        Select location
                      </option>
                      {locations.slice(1).map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="edit-description" className="text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    name="description"
                    placeholder="Describe your item in detail"
                    className="w-full min-h-[100px] p-2 border rounded-md bg-background"
                    value={newListing.description}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="edit-telegramUsername" className="text-sm font-medium">
                    Telegram Username (for contact)
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                      @
                    </span>
                    <Input
                      id="edit-telegramUsername"
                      name="telegramUsername"
                      placeholder="your_username"
                      className="rounded-l-none"
                      value={newListing.telegramUsername}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Images</label>
                  <div className="border-2 border-dashed border-input rounded-md p-4">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {previewImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image || "/placeholder.svg"}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-5 w-5"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {previewImages.length < 5 && (
                      <div
                        className="flex flex-col items-center justify-center py-4 cursor-pointer border border-dashed border-input rounded-md"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium mb-1">Upload images</p>
                        <p className="text-xs text-muted-foreground">Click to browse or drag and drop</p>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingListing(null)
                      setPreviewImages([])
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Update Listing</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



