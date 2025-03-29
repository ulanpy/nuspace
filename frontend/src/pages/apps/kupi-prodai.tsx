"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Search, Filter, ShoppingBag, Heart, MessageSquare, X, Camera } from "lucide-react"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"

interface Product {
  id: number
  title: string
  price: number
  category: string
  condition: "New" | "Used" | "Like New"
  image: string
  seller: string
  location: string
  likes: number
  messages: number
  description?: string
  telegramUsername?: string
  datePosted?: string
  isOwner?: boolean
}

// Sample products data
const products: Product[] = [
  {
    id: 1,
    title: "Calculus Textbook",
    price: 5000,
    category: "Books",
    condition: "Used",
    image: "https://placehold.co/200x200",
    seller: "Alex K.",
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
    image: "https://placehold.co/200x200",
    seller: "Maria S.",
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
    image: "https://placehold.co/200x200",
    seller: "Timur A.",
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
    image: "https://placehold.co/200x200",
    seller: "Aisha N.",
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
    image: "https://placehold.co/200x200",
    seller: "Ruslan M.",
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
    image: "https://placehold.co/200x200",
    seller: "Dana K.",
    location: "Block 3B",
    likes: 4,
    messages: 2,
    description: "Comprehensive physics notes for PHY201. Includes all formulas and example problems.",
    telegramUsername: "dana_k",
    datePosted: "2 weeks ago",
  },
]

// Sample user's listings
const myListings: Product[] = [
  {
    id: 101,
    title: "Programming Textbook",
    price: 4500,
    category: "Books",
    condition: "Like New",
    image: "https://placehold.co/200x200",
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
    image: "https://placehold.co/200x200",
    seller: "You",
    location: "Block 2A",
    likes: 0,
    messages: 0,
    description: "New desk organizer, still in packaging. Decided I don't need it.",
    isOwner: true,
    datePosted: "3 days ago",
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
  const [activeTab, setActiveTab] = useState("buy")
  const [likedProducts, setLikedProducts] = useState<number[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showProductDetails, setShowProductDetails] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedCondition, setSelectedCondition] = useState("All Conditions")
  const [showFilters, setShowFilters] = useState(false)
  const [messageText, setMessageText] = useState("")

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
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleLike = (id: number) => {
    if (likedProducts.includes(id)) {
      setLikedProducts(likedProducts.filter((productId) => productId !== id))
    } else {
      setLikedProducts([...likedProducts, id])
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
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setPreviewImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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
    // Here you would normally send the data to your backend
    alert("Listing submitted successfully!")
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
    setPreviewImage(null)
    setActiveTab("buy")
  }

  const openProductDetails = (product: Product) => {
    setSelectedProduct(product)
    setShowProductDetails(true)
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

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedProduct) return

    // Here you would normally send the message to your backend
    alert(`Message sent to ${selectedProduct.seller}: ${messageText}`)
    setMessageText("")
    setShowProductDetails(false)
  }

  const initiateContactWithSeller = (telegramUsername: string) => {
    window.open(`https://t.me/${telegramUsername}`, "_blank")
  }

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

          {filteredProducts.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredProducts.map((product) => (
                <motion.div key={product.id} variants={itemVariants}>
                  <Card
                    className="overflow-hidden h-full cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openProductDetails(product)}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={product.image || "/placeholder.svg"}
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
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                        <span>{product.seller}</span>
                        <span className="mx-1 sm:mx-2">•</span>
                        <span>{product.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex gap-1 text-muted-foreground hover:text-foreground h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleLike(product.id)
                          }}
                        >
                          <Heart
                            className={`h-4 w-4 ${likedProducts.includes(product.id) ? "fill-red-500 text-red-500" : ""}`}
                          />
                          <span className="text-xs">
                            {likedProducts.includes(product.id) ? product.likes + 1 : product.likes}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex gap-1 text-muted-foreground hover:text-foreground h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            openProductDetails(product)
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-xs">{product.messages}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
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
                  <label className="text-sm font-medium">Upload Image</label>
                  <div className="border-2 border-dashed border-input rounded-md p-4">
                    {previewImage ? (
                      <div className="relative">
                        <img
                          src={previewImage || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-48 object-contain rounded-md"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center py-4 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium mb-1">Upload an image</p>
                        <p className="text-xs text-muted-foreground">Click to browse or drag and drop</p>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageUpload}
                          required
                        />
                      </div>
                    )}
                  </div>
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
                Active Listings
              </TabsTrigger>
              <TabsTrigger value="sold" className="flex-1">
                Sold Items
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="pt-4">
              {myListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {myListings.map((product) => (
                    <Card key={product.id} className="overflow-hidden h-full">
                      <div className="aspect-square relative">
                        <img
                          src={product.image || "/placeholder.svg"}
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
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              Delete
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
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No sold items</h3>
                <p className="text-sm text-muted-foreground max-w-md">Items you've sold will appear here.</p>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Product Detail Modal (simplified) */}
      {showProductDetails && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/2">
                <img
                  src={selectedProduct.image || "/placeholder.svg"}
                  alt={selectedProduct.title}
                  className="w-full h-full object-cover aspect-square"
                />
              </div>
              <div className="p-4 md:p-6 md:w-1/2 flex flex-col">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold">{selectedProduct.title}</h2>
                    <Badge className={getConditionColor(selectedProduct.condition) + " text-white"}>
                      {selectedProduct.condition}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold mb-4">{selectedProduct.price} ₸</p>

                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 rounded-full bg-muted mr-2 flex items-center justify-center">
                      {selectedProduct.seller.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedProduct.seller}</p>
                      <p className="text-xs text-muted-foreground">{selectedProduct.location}</p>
                    </div>
                  </div>

                  <div className="h-px w-full bg-border my-4" />

                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Category</div>
                      <div>{selectedProduct.category}</div>
                      <div className="text-muted-foreground">Posted</div>
                      <div>{selectedProduct.datePosted || "Recently"}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Button
                    className="w-full"
                    onClick={() => {
                      setShowProductDetails(false)
                      // In a real app, you would show a purchase form here
                      alert(`Contacting seller for ${selectedProduct.title}`)
                    }}
                  >
                    Buy Now
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (selectedProduct.telegramUsername) {
                        initiateContactWithSeller(selectedProduct.telegramUsername)
                      }
                    }}
                  >
                    Contact on Telegram
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setShowProductDetails(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


