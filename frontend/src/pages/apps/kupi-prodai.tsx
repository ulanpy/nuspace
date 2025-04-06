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
  Camera,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/auth-context"
import { kupiProdaiApi, type Product, type NewProductRequest } from "../../api/kupi-prodai-api"
import { defaultSize, defaultPage} from "../../api/kupi-prodai-api"
import { useToast } from "../../hooks/use-toast"

// Define categories and conditions
const categories = ["All Categories", "books", "electronics", "clothing", "home", "sports", "other"]
const displayCategories = ["All Categories", "Books", "Electronics", "Clothing", "Home", "Sports", "Other"]

const conditions = ["All Conditions", "new", "like_new", "used"]
const displayConditions = ["All Conditions", "New", "Like New", "Used"]

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(defaultPage)
  const [itemsPerPage, setItemsPerPage] = useState(defaultSize)

  // Products state
  const [products, setProducts] = useState<Product[]>([])
  const [myProducts, setMyProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])

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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setProducts(data)
      setFilteredProducts(data)

      // Calculate total pages (assuming we know the total count)
      // In a real app, the API would return the total count
      setTotalPages(Math.ceil(data.length / itemsPerPage))
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
      setFilteredProducts(data)
      setTotalPages(Math.ceil(data.length / itemsPerPage))
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
    setNewListing((prev) => ({
      ...prev,
      [name]: name === "price" ? Number.parseFloat(value) : value,
    }))
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewListing((prev) => ({ ...prev, [name]: value }))
  }

  // Create new product
  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault()

    if (previewImages.length === 0) {
      toast({
        title: "Error",
        description: "Please upload at least one image",
        variant: "destructive",
      })
      return
    }

    try {
      // In a real app, you would upload the images first and get URLs
      // Then create the product with those URLs
      const createdProduct = await kupiProdaiApi.createProduct(newListing)

      // Refresh user products
      fetchUserProducts()

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

      // Navigate to my-listings tab
      setActiveTab("my-listings")

      toast({
        title: "Success",
        description: "Product created successfully",
      })
    } catch (err) {
      console.error("Failed to create product:", err)
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      })
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
      status: product.status,
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

  // Mark product as sold
  const handleMarkAsSold = async (id: number) => {
    try {
      await kupiProdaiApi.updateProduct({
        product_id: id,
        status: "sold",
      })

      // Refresh user products
      fetchUserProducts()

      toast({
        title: "Success",
        description: "Product marked as sold",
      })
    } catch (err) {
      console.error("Failed to mark product as sold:", err)
      toast({
        title: "Error",
        description: "Failed to mark product as sold",
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
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  // Active and sold listings
  const activeListings = myProducts.filter((p) => p.status === "active")
  const soldListings = myProducts.filter((p) => p.status === "sold")

  // Current page items
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)

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
                  {categories.map((category, index) => (
                    <option key={category} value={category}>
                      {displayCategories[index]}
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
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchProducts}>
                Try Again
              </Button>
            </div>
          ) : currentItems.length > 0 ? (
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
                            className="flex gap-1 text-muted-foreground hover:text-foreground h-6 px-1.5"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleLike(product.id)
                            }}
                          >
                            <Heart
                              className={`h-3 w-3 ${likedProducts.includes(product.id) ? "fill-red-500 text-red-500" : ""}`}
                            />
                            <span className="text-[10px]">{likedProducts.includes(product.id) ? "Liked" : "Like"}</span>
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
                            <span className="text-[10px]">Details</span>
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
              {isAuthenticated ? (
                <>
                  <h2 className="text-xl font-bold mb-4">Create a New Listing</h2>
                  <form onSubmit={handleSubmitListing} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">
                        Title
                      </label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="What are you selling?"
                        value={newListing.name}
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
                          {categories.slice(1).map((category, index) => (
                            <option key={category} value={category}>
                              {displayCategories[index + 1]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

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
                        {conditions.slice(1).map((condition, index) => (
                          <option key={condition} value={condition}>
                            {displayConditions[index + 1]}
                          </option>
                        ))}
                      </select>
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

                  {/* Add a note about the temporary removal of Telegram binding */}
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
                    <p>
                      <strong>Note:</strong> Telegram binding requirement has been temporarily disabled for testing
                      purposes.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                  <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                  <h3 className="text-lg sm:text-xl font-medium mb-1 sm:mb-2">Login to Sell Items</h3>
                  <p className="text-sm text-muted-foreground mb-4 sm:mb-6 max-w-md">
                    You need to login before you can sell items on the marketplace
                  </p>
                  <Button size="sm" onClick={login} className="flex gap-2">
                    <User className="h-4 w-4" />
                    <span>Login</span>
                  </Button>
                </div>
              )}
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
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : activeListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {activeListings.map((product) => (
                    <Card key={product.id} className="overflow-hidden h-full">
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
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : soldListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {soldListings.map((product) => (
                    <Card key={product.id} className="overflow-hidden h-full opacity-75">
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
                  <label htmlFor="edit-name" className="text-sm font-medium">
                    Title
                  </label>
                  <Input
                    id="edit-name"
                    name="name"
                    placeholder="What are you selling?"
                    value={newListing.name}
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
                      {categories.slice(1).map((category, index) => (
                        <option key={category} value={category}>
                          {displayCategories[index + 1]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

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
                    {conditions.slice(1).map((condition, index) => (
                      <option key={condition} value={condition}>
                        {displayConditions[index + 1]}
                      </option>
                    ))}
                  </select>
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

