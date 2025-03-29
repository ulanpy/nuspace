"use client"
import { Heart, MessageSquare } from "lucide-react"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"

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
  datePosted?: string
  isOwner?: boolean
}

interface ProductCardProps {
  product: Product
  isLiked: boolean
  onLikeToggle: (id: number) => void
  onClick: (product: Product) => void
}

export function ProductCard({ product, isLiked, onLikeToggle, onClick }: ProductCardProps) {
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
    <Card
      className="overflow-hidden h-full cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(product)}
    >
      <div className="aspect-square relative">
        <img src={product.image || "/placeholder.svg"} alt={product.title} className="object-cover w-full h-full" />
        <Badge className={`absolute top-2 right-2 ${getConditionColor(product.condition)} text-white text-xs`}>
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
              onLikeToggle(product.id)
            }}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
            <span className="text-xs">{isLiked ? product.likes + 1 : product.likes}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex gap-1 text-muted-foreground hover:text-foreground h-8 px-2"
            onClick={(e) => {
              e.stopPropagation()
              onClick(product)
            }}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">{product.messages}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

