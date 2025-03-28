"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Filter, ShoppingBag, Heart, MessageSquare, ArrowRight } from "lucide-react"
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
}

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
  },
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
  const [activeTab, setActiveTab] = useState("buy")
  const [likedProducts, setLikedProducts] = useState<number[]>([])

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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Kupi&Prodai</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Buy and sell items within the university community</p>
      </div>

      <Tabs defaultValue="buy" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy">Buy</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
        </TabsList>
        <TabsContent value="buy" className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." className="pl-9 text-sm" />
            </div>
            <Button variant="outline" size="sm" className="flex gap-2 sm:size-default">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {products.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
                <Card className="overflow-hidden h-full">
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
                        onClick={() => toggleLike(product.id)}
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
        </TabsContent>
        <TabsContent value="sell" className="pt-3 sm:pt-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-medium mb-1 sm:mb-2">Sell your items</h3>
                <p className="text-sm text-muted-foreground mb-4 sm:mb-6 max-w-md">
                  Take a photo, set a price, and connect with buyers in your university community
                </p>
                <Button size="sm" className="flex gap-2 sm:size-default">
                  <span>Create Listing</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

