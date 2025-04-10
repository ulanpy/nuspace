"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Filter,
  ShoppingBag,
  Heart,
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ImageIcon,
} from "lucide-react"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/auth-context"
import {
  kupiProdaiApi,
  type Product,
  type NewProductRequest,
  defaultSize,
  defaultPage,
} from "../../api/kupi-prodai-api"
import { useToast } from "../../hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert"
import { Progress } from "../../components/ui/progress"
import { Skeleton } from "../../components/ui/skeleton"

// Define categories and conditions
const categories = [
  "All Categories",
  "books",
  "electronics",
  "clothing",
  "furniture",
  "appliances",
  "sports",
  "stationery",
  "art_supplies",
  "beauty",
  "services",
  "food",
  "tickets",
  "transport",
  "others",
]

const displayCategories = [
  "All Categories",
  "Books",
  "Electronics",
  "Clothing",
  "Furniture",
  "Appliances",
  "Sports",
  "Stationery",
  "Art Supplies",
  "Beauty",
  "Services",
  "Food",
  "Tickets",
  "Transport",
  "Others",
]

const conditions = ["All Conditions", "new", "like_new", "used"]
const displayConditions = ["All Conditions", "New", "Like New", "Used"]

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
  const { user, isAuthenticated, login } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("buy")
  const [likedProducts, setLikedProducts] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedCondition, setSelectedCondition] = useState("All Conditions")
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(defaultPage)
  const [itemsPerPage, setItemsPerPage] = useState(defaultSize)
  const [totalPages, setTotalPages] = useState(1)

  // Products state
  const [products, setProducts] = useState<Product[]>([])
  const [myProducts, setMyProducts] = useState<Product[]>([])

  // New listing form state
  const [newListing, setNewListing] = useState<NewProductRequest>({
    name: "",
    description: "",
    price: 0,
    category: "books",
    condition: "new",
    status: "active",
  })
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Edit listing state
  const [editingListing, setEditingListing] = useState<Product | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Fetch products on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts()
      fetchUserProducts()
    }
  }, [isAuthenticated])

  // Fetch products when filters change
  useEffect(() => {
    if (activeTab === "buy") {
      if (searchQuery.trim()) {
        searchProducts(searchQuery)
      } else {
        fetchProducts()
      }
    }
  }, [activeTab, selectedCategory, selectedCondition, currentPage, searchQuery])

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const category = selectedCategory !== "All Categories" ? selectedCategory.toLowerCase() : undefined
      const condition = selectedCondition !== "All Conditions" ? selectedCondition.toLowerCase() : undefined

      const data = await kupiProdaiApi.getProducts(currentPage, itemsPerPage, category, condition)
      setProducts(data.products)
      setTotalPages(data.num_of_pages)
    } catch (err) {
      setError("Failed to fetch products")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch user's products
  const fetchUserProducts = async () => {
    try {
      const data = await kupiProdaiApi.getUserProducts()
      setMyProducts(data)
    } catch (err) {
      console.error("Failed to fetch user products:", err)
    }
  }

  // Search products
  const searchProducts = async (keyword: string) => {
    if (!keyword.trim()) {
      fetchProducts()
      return
    }

    try {
      setIsLoading(true)
      const data = await kupiProdaiApi.searchProducts(keyword)
      setProducts(data)
      setTotalPages(1) // Search results are not paginated in the API
    } catch (err) {
      console.error("Search failed:", err)
      setError("Search failed")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFiles(Array.from(files))
    }
  }

  // Process files for upload
  const processFiles = (files: File[]) => {
    const newPreviewImages = [...previewImages]
    const newImageFiles = [...imageFiles]

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onloadend = () => {
          newPreviewImages.push(reader.result as string)
          newImageFiles.push(file)
          setPreviewImages([...newPreviewImages])
          setImageFiles([...newImageFiles])
        }
        reader.readAsDataURL(file)
      } else {
        toast({
          title: "Invalid file type",
          description: "Only image files are allowed",
          variant: "destructive",
        })
      }
    })
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files))
    }
  }

  const removeImage = (index: number) => {
    const newPreviewImages = [...previewImages]
    const newImageFiles = [...imageFiles]
    newPreviewImages.splice(index, 1)
    newImageFiles.splice(index, 1)
    setPreviewImages(newPreviewImages)
    setImageFiles(newImageFiles)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name === "price") {
      // Handle price input specially to avoid leading zeros and negative values
      const numValue = value === "" ? 0 : Math.max(0, Number.parseInt(value, 10))
      setNewListing((prev) => ({ ...prev, [name]: numValue }))
    } else {
      setNewListing((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handlePriceInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Clear the input when it's focused and the value is 0
    if (e.target.value === "0") {
      e.target.value = ""
    }
  }

  const handlePriceInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If the input is empty when blurred, set it back to 0
    if (e.target.value === "") {
      setNewListing((prev) => ({ ...prev, price: 0 }))
    }
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewListing((prev) => ({ ...prev, [name]: value }))
  }

  // Check if user has Telegram linked
  const isTelegramLinked = user?.tg_linked || false

  // Create new product and upload images
  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if Telegram is linked
    if (!isTelegramLinked) {
      toast({
        title: "Telegram Required",
        description: "You need to link your Telegram account before selling items.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(10)

      // Step 1: Create the product
      const createdProduct = await kupiProdaiApi.createProduct(newListing)
      setUploadProgress(30)

      // Step 2: Upload images if there are any
      if (imageFiles.length > 0) {
        // Get signed URLs for image uploads
        const signedUrlsResponse = await kupiProdaiApi.getSignedUrls(imageFiles.length)
        setUploadProgress(50)

        // Upload each image
        const uploadPromises = imageFiles.map((file, index) => {
          const signedUrl = signedUrlsResponse.signed_urls[index]
          return kupiProdaiApi.uploadImage(
            file,
            signedUrl.filename,
            createdProduct.id,
            index + 1, // Media order starts from 1
          )
        })

        await Promise.all(uploadPromises)
        setUploadProgress(90)
      }

      // Step 3: Refresh user products to show the updated product with images
      await fetchUserProducts()
      setUploadProgress(100)

      // Reset form
      setNewListing({
        name: "",
        description: "",
        price: 0,
        category: "books",
        condition: "new",
        status: "active",
      })
      setPreviewImages([])
      setImageFiles([])

      // Navigate to my-listings tab
      setActiveTab("my-listings")

      toast({
        title: "Success",
        description: "Product created successfully",
      })
    } catch (err) {
      console.error("Failed to create product or upload images:", err)
      toast({
        title: "Error",
        description: "Failed to create product or upload images",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Update product
  const handleEditListing = (product: Product) => {
    setEditingListing(product)
    setNewListing({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      condition: product.condition,
      status: "active",
    })
    setPreviewImages(product.media.map((m) => m.url))
    setShowEditModal(true)
  }

  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingListing) return

    try {
      await kupiProdaiApi.updateProduct({
        product_id: editingListing.id,
        name: newListing.name,
        description: newListing.description,
        price: newListing.price,
        category: newListing.category,
        condition: newListing.condition,
      })

      // Refresh user products
      fetchUserProducts()

      // Reset form and close modal
      setEditingListing(null)
      setNewListing({
        name: "",
        description: "",
        price: 0,
        category: "books",
        condition: "new",
        status: "active",
      })
      setPreviewImages([])
      setImageFiles([])
      setShowEditModal(false)

      toast({
        title: "Success",
        description: "Product updated successfully",
      })
    } catch (err) {
      console.error("Failed to update product:", err)
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      })
    }
  }

  // Delete product
  const handleDeleteListing = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this listing?")) {
      try {
        await kupiProdaiApi.deleteProduct(id)

        // Refresh user products
        fetchUserProducts()

        toast({
          title: "Success",
          description: "Product deleted successfully",
        })
      } catch (err) {
        console.error("Failed to delete product:", err)
        toast({
          title: "Error",
          description: "Failed to delete product",
          variant: "destructive",
        })
      }
    }
  }

  // Mark product as sold/active
  const handleToggleProductStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active"

      await kupiProdaiApi.updateProduct({
        product_id: id,
        status: newStatus,
      })

      // Refresh user products
      fetchUserProducts()

      toast({
        title: "Success",
        description: newStatus === "active" ? "Product marked as active" : "Product marked as inactive",
      })
    } catch (err) {
      console.error("Failed to update product status:", err)
      toast({
        title: "Error",
        description: "Failed to update product status",
        variant: "destructive",
      })
    }
  }

  const toggleLike = (id: number) => {
    if (likedProducts.includes(id)) {
      setLikedProducts(likedProducts.filter((productId) => productId !== id))
    } else {
      setLikedProducts([...likedProducts, id])
    }
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
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  }

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  // Active and inactive listings
  const activeListings = myProducts.filter((p) => p.status === "active")
  const inactiveListings = myProducts.filter((p) => p.status === "inactive")
  const soldListings = myProducts.filter((p) => p.status === "inactive")

  // Product skeleton for loading state
  const ProductSkeleton = () => (
    <Card className="overflow-hidden h-full">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Add this function to renew a sold product
  const handleRenewListing = async (id: number) => {
    try {
      await kupiProdaiApi.updateProduct({
        product_id: id,
        status: "active",
      })

      // Refresh user products
      fetchUserProducts()

      toast({
        title: "Success",
        description: "Product renewed and is now active",
      })
    } catch (err) {
      console.error("Failed to renew product:", err)
      toast({
        title: "Error",
        description: "Failed to renew product",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Kupi&Prodai</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Buy and sell items within the university community</p>
      </div>

      <Tabs defaultValue="buy" className="w-full" onValueChange={setActiveTab} value={activeTab}>
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
                <label htmlFor="category" className="block text-sm font-medium">
                  Category
                </label>
                <select
                  id="category"
                  className="w-full p-2 border rounded-md bg-background text-foreground"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((category, index) => (
                    <option key={category} value={category}>
                      {displayCategories[index]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="condition" className="block text-sm font-medium">
                  Condition
                </label>
                <select
                  id="condition"
                  className="w-full p-2 border rounded-md bg-background text-foreground"
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                >
                  {conditions.map((condition, index) => (
                    <option key={condition} value={condition}>
                      {displayConditions[index]}
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

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchProducts}>
                Try Again
              </Button>
            </div>
          ) : products.length > 0 ? (
            <>
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {products.map((product) => (
                  <motion.div key={product.id} variants={itemVariants}>
                    <Card
                      className="overflow-hidden h-full cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/apps/kupi-prodai/product/${product.id}`)}
                    >
                      <div className="aspect-square relative">
                        <img
                          src={product.media[0]?.url || "/placeholder.svg?height=200&width=200"}
                          alt={product.name}
                          className="object-cover w-full h-full"
                        />
                        <Badge
                          className={`absolute top-2 right-2 ${getConditionColor(product.condition)} text-white text-xs`}
                        >
                          {getConditionDisplay(product.condition)}
                        </Badge>
                      </div>
                      <CardContent className="p-2 sm:p-3">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h3 className="font-medium text-xs sm:text-sm line-clamp-1">{product.name}</h3>
                            <p className="text-sm sm:text-base font-bold">{product.price} ₸</p>
                          </div>
                        </div>
                        <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground mb-1">
                          <div className="flex items-center">
                            <span>{product.category && getCategoryDisplay(product.category)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex gap-1 text-muted-foreground hover:text-primary"
                          >
                            <Heart className="h-4 w-4" />
                            <span>Like</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex gap-1 text-muted-foreground hover:text-primary"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>Message</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => paginate(currentPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <span className="mx-2 text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => paginate(currentPage + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p>No products found.</p>
            </div>
          )}
        </TabsContent>

        {/* SELL SECTION */}
        <TabsContent value="sell" className="space-y-4 pt-4">
          {!isAuthenticated ? (
            <Alert variant="destructive">
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                You must be logged in to create a listing.
                <Button variant="link" onClick={() => login()}>
                  Login
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmitListing} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium">
                  Name
                </label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={newListing.name}
                  onChange={handleInputChange}
                  required
                  className="bg-background text-foreground"
                  placeholder="What are you selling?"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={newListing.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-2 border rounded-md bg-background text-foreground"
                  placeholder="Describe your item..."
                />
              </div>

              {/* Price, Category, and Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="price" className="block text-sm font-medium">
                    Price (₸)
                  </label>
                  <Input
                    type="number"
                    id="price"
                    name="price"
                    value={newListing.price === 0 ? "" : newListing.price}
                    onChange={handleInputChange}
                    onFocus={handlePriceInputFocus}
                    onBlur={handlePriceInputBlur}
                    min="0"
                    step="1"
                    required
                    className="bg-background text-foreground"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="category" className="block text-sm font-medium">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={newListing.category}
                    onChange={handleSelectChange}
                    className="w-full p-2 border rounded-md bg-background text-foreground"
                    required
                  >
                    {categories.slice(1).map((category, index) => (
                      <option key={category} value={category}>
                        {displayCategories[index + 1]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="condition" className="block text-sm font-medium">
                    Condition
                  </label>
                  <select
                    id="condition"
                    name="condition"
                    value={newListing.condition}
                    onChange={handleSelectChange}
                    className="w-full p-2 border rounded-md bg-background text-foreground"
                    required
                  >
                    {conditions.slice(1).map((condition, index) => (
                      <option key={condition} value={condition}>
                        {displayConditions[index + 1]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image Upload with Drag and Drop */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Images</label>
                <div
                  ref={dropZoneRef}
                  className={`border-2 ${
                    isDragging ? "border-primary" : "border-dashed"
                  } rounded-md p-6 transition-colors duration-200 ease-in-out`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-1">Upload a file or drag and drop</p>
                    <p className="text-xs text-muted-foreground mb-4">PNG, JPG, GIF up to 10MB</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                    />
                    <Button type="button" variant="outline" size="sm">
                      Upload a file
                    </Button>
                  </div>
                </div>

                {/* Image Preview */}
                {previewImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                    {previewImages.map((src, index) => (
                      <div key={index} className="relative aspect-square rounded-md overflow-hidden">
                        <img
                          src={src || "/placeholder.svg"}
                          alt={`Preview ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage(index)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button type="submit" disabled={isUploading} className="w-full">
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="animate-spin h-4 w-4" />
                    <span>Uploading... {uploadProgress}%</span>
                  </div>
                ) : (
                  "Create Listing"
                )}
              </Button>

              {isUploading && <Progress value={uploadProgress} className="mt-2" />}
            </form>
          )}
        </TabsContent>

        {/* MY LISTINGS SECTION */}
        <TabsContent value="my-listings" className="space-y-4 pt-4">
          {!isAuthenticated ? (
            <Alert variant="destructive">
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                You must be logged in to view your listings.
                <Button variant="link" onClick={() => login()}>
                  Login
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Active Listings */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Active Listings</h2>
                {activeListings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeListings.map((product) => (
                      <Card key={product.id} className="overflow-hidden">
                        <div className="aspect-square relative">
                          <img
                            src={product.media[0]?.url || "/placeholder.svg?height=200&width=200"}
                            alt={product.name}
                            className="object-cover w-full h-full"
                          />
                          <Badge
                            className={`absolute top-2 right-2 ${getConditionColor(product.condition)} text-white text-xs`}
                          >
                            {getConditionDisplay(product.condition)}
                          </Badge>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                          <p className="text-sm font-bold">{product.price} ₸</p>
                          <div className="flex justify-between mt-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditListing(product)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteListing(product.id)}>
                              Delete
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleToggleProductStatus(product.id, product.status)}
                            >
                              Mark as Sold
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p>No active listings found.</p>
                )}
              </div>

              {/* Inactive Listings */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Inactive Listings</h2>
                {inactiveListings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inactiveListings.map((product) => (
                      <Card key={product.id} className="overflow-hidden">
                        <div className="aspect-square relative">
                          <img
                            src={product.media[0]?.url || "/placeholder.svg?height=200&width=200"}
                            alt={product.name}
                            className="object-cover w-full h-full"
                          />
                          <Badge
                            className={`absolute top-2 right-2 ${getConditionColor(product.condition)} text-white text-xs`}
                          >
                            {getConditionDisplay(product.condition)}
                          </Badge>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                          <p className="text-sm font-bold">{product.price} ₸</p>
                          <div className="flex justify-between mt-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditListing(product)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteListing(product.id)}>
                              Delete
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleToggleProductStatus(product.id, product.status)}
                            >
                              Mark as Active
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p>No inactive listings found.</p>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Update the sold items section */}
        <TabsContent value="sold" className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : soldListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {soldListings.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden h-full cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/apps/kupi-prodai/product/${product.id}`)}
                >
                  <div className="aspect-square relative">
                    <img
                      src={product.media[0]?.url || "/placeholder.svg?height=200&width=200"}
                      alt={product.name}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <Badge className="bg-green-500 text-white text-sm px-3 py-1">SOLD</Badge>
                    </div>
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-1 sm:mb-2">
                      <div>
                        <h3 className="font-medium text-sm sm:text-base">{product.name}</h3>
                        <p className="text-base sm:text-lg font-bold">{product.price} ₸</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryDisplay(product.category)}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-3">
                      <p className="line-clamp-2">{product.description}</p>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRenewListing(product.id)
                        }}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        Renew Listing
                      </Button>
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

      {/* Edit Listing Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 text-center">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-headline"
            >
              <form onSubmit={handleUpdateListing} className="space-y-4 p-4">
                <h2 className="text-lg font-semibold">Edit Listing</h2>

                {/* Name and Description */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    value={newListing.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={newListing.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                {/* Price, Category, and Condition */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                      Price (₸)
                    </label>
                    <Input
                      type="number"
                      id="price"
                      name="price"
                      value={newListing.price === 0 ? "" : newListing.price}
                      onChange={handleInputChange}
                      onFocus={handlePriceInputFocus}
                      onBlur={handlePriceInputBlur}
                      min="0"
                      step="1"
                      required
                      className="mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={newListing.category}
                      onChange={handleSelectChange}
                      className="mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      {categories.slice(1).map((category) => (
                        <option key={category} value={category}>
                          {displayCategories[categories.indexOf(category)]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
                      Condition
                    </label>
                    <select
                      id="condition"
                      name="condition"
                      value={newListing.condition}
                      onChange={handleSelectChange}
                      className="mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      {conditions.slice(1).map((condition) => (
                        <option key={condition} value={condition}>
                          {displayConditions[conditions.indexOf(condition)]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>
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
