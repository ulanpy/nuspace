"use client"

import { useState } from "react"
import { ExternalLink, MessageSquare, Send } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"

interface Product {
  id: number
  title: string
  price: number
  image: string
  seller: string
  location: string
  telegramUsername?: string
}

interface PurchaseDialogProps {
  product: Product | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSendMessage: (message: string) => void
  onContactSeller: (username: string) => void
}

export function PurchaseDialog({ product, isOpen, onOpenChange, onSendMessage, onContactSeller }: PurchaseDialogProps) {
  const [messageText, setMessageText] = useState("Hi, I'm interested in your item. Is it still available?")

  if (!product) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>Contact the seller to arrange payment and pickup.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <img
              src={product.image || "/placeholder.svg"}
              alt={product.title}
              className="w-20 h-20 object-cover rounded-md"
            />
            <div>
              <h3 className="font-medium">{product.title}</h3>
              <p className="text-lg font-bold">{product.price} ₸</p>
              <p className="text-sm text-muted-foreground">
                {product.seller} • {product.location}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="message">Message to Seller</Label>
            <Textarea
              id="message"
              placeholder="Hi, I'm interested in your item. Is it still available?"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Contact Options</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="flex justify-start gap-2"
                onClick={() => {
                  if (product.telegramUsername) {
                    onContactSeller(product.telegramUsername)
                  }
                }}
              >
                <ExternalLink className="h-4 w-4" />
                <span>Telegram</span>
              </Button>
              <Button variant="outline" className="flex justify-start gap-2" onClick={() => onSendMessage(messageText)}>
                <MessageSquare className="h-4 w-4" />
                <span>In-app Message</span>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSendMessage(messageText)
              onOpenChange(false)
            }}
            className="sm:flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

