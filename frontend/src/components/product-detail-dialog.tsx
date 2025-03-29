"use client"
import { ExternalLink } from "lucide-react"
import { Dialog, DialogContent } from "./ui/dialog"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

interface Product {
  id: number
  title: string
  price: number
  category: string
  condition: "New" | "Used" | "Like New"
  image: string
  seller: string
  sellerAvatar?: string
  location: string
  likes: number
  messages: number
  description?: string
  telegramUsername?: string
  datePosted?: string
}

interface ProductDetailDialogProps {
  product: Product | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onBuyNow: () => void
  onContactSeller: (username: string) => void
}

export function ProductDetailDialog({
  product,
  isOpen,
  onOpenChange,
  onBuyNow,
  onContactSeller,
}: ProductDetailDialogProps) {
  if (!product) return null

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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/2">
            <img
              src={product.image || "/placeholder.svg"}
              alt={product.title}
              className="w-full h-full object-cover aspect-square"
            />
          </div>
          <div className="p-4 md:p-6 md:w-1/2 flex flex-col">
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold">{product.title}</h2>
                <Badge className={getConditionColor(product.condition) + " text-white"}>{product.condition}</Badge>
              </div>
              <p className="text-2xl font-bold mb-4">{product.price} ₸</p>

              <div className="flex items-center mb-4">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={product.sellerAvatar} />
                  <AvatarFallback>{product.seller.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{product.seller}</p>
                  <p className="text-xs text-muted-foreground">{product.location}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Category</div>
                  <div>{product.category}</div>
                  <div className="text-muted-foreground">Posted</div>
                  <div>{product.datePosted || "Recently"}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Button className="w-full" onClick={onBuyNow}>
                Buy Now
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (product.telegramUsername) {
                    onContactSeller(product.telegramUsername)
                  }
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Contact on Telegram
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
