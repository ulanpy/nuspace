"use client"

import type React from "react"

{
  /* Comments Section */
}
import { MessageSquare, Send, X, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/hooks/use-toast"

interface Comment {
  id: number
  user_id: number
  user_name: string
  user_surname: string
  text: string
  created_at: string
}

interface Product {
  user_name: string
  id: number
}

interface User {
  user: {
    sub: string
  }
}

interface CommentsSectionProps {
  comments: Comment[]
  totalComments: number
  product: Product
  onDeleteComment: (commentId: number) => void
  onSendMessage: (message: string) => void
  currentPage: number
  totalPages: number
  handlePageChange: (page: number) => void
  commentsPerPage: number
  fetchFeedback: (page: number, limit: number) => Promise<{ data: Comment[]; total: number }>
  setCurrentPage: (page: number) => void
  setTotalComments: (total: number) => void
  setTotalPages: (totalPages: number) => void
}

const { toast } = useToast()

const CommentsSection: React.FC<CommentsSectionProps> = ({
  comments,
  totalComments,
  product,
  onDeleteComment,
  onSendMessage,
  currentPage,
  totalPages,
  handlePageChange,
  commentsPerPage,
  fetchFeedback,
  setCurrentPage,
  setTotalComments,
  setTotalPages,
}) => {
  const [message, setMessage] = useState("")
  const { isAuthenticated, user } = useAuth()

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      })
      return
    }

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to comment",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`http://localhost/api/products/feedback/${product.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          product_id: product.id,
          text: message,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      // Reset message
      setMessage("")

      // Refresh feedback list with current pagination
      const feedbackData = await fetchFeedback(1, commentsPerPage) // Go to first page after adding comment
      setCurrentPage(1) // Reset to first page
      setTotalComments(feedbackData.total)
      setTotalPages(Math.ceil(feedbackData.total / commentsPerPage))

      toast({
        title: "Success",
        description: "Message sent successfully",
      })
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteComment = (commentId: number) => {
    onDeleteComment(commentId)
  }

  const formatCommentDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date"
      }
      return format(date, "MMM d, yyyy 'at' h:mm a")
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Invalid date"
    }
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <span>Comments ({totalComments})</span>
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
            <Button
              className="w-full flex items-center justify-center gap-1"
              onClick={handleSendMessage}
              disabled={!isAuthenticated}
            >
              <Send className="h-4 w-4" />
              <span>Send Message</span>
            </Button>
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground text-center mt-2">You need to be logged in to comment</p>
            )}
          </div>
        </CardContent>
      </Card>

      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card
              key={comment.id}
              className={comment.user_name === product.user_name ? "border-primary/30 bg-primary/5" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{`${comment.user_name} ${comment.user_surname[0]}.`}</span>
                        {comment.user_name === product.user_name && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            Seller
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatCommentDate(comment.created_at)}</span>
                        {/* Show delete button only for the comment owner */}
                        {user?.user?.sub === comment.user_id.toString() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md bg-muted/20">
          <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-lg font-medium mb-1">No comments yet</h3>
          <p className="text-sm text-muted-foreground">Be the first to ask about this item</p>
        </div>
      )}
    </div>
  )
}

export default CommentsSection
