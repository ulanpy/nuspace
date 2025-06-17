"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/utils/date-formatter";
import { useUser } from "@/hooks/use-user";

interface Comment {
  id: number;
  user_id: number;
  user_name: string;
  user_surname: string;
  product_id: number;
  text: string;
  created_at: string;
}

interface CommentsSectionProps {
  productId: number;
  sellerName?: string;
  isAuthenticated: boolean;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({
  productId,
  sellerName,
  isAuthenticated,
}) => {
  const [message, setMessage] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const commentsPerPage = 5;

  const { toast } = useToast();
  const { user } = useUser();
  // Fetch comments on component mount and when page changes
  useEffect(() => {
    fetchComments(currentPage);
  }, [productId, currentPage]);

  const fetchComments = async (page: number) => {
    if (!productId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/reviews?reviewable_type=products&entity_id=${productId}&size=${commentsPerPage}&page=${page}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const data = await response.json();
      setComments(data.product_feedbacks || []);
      setTotalPages(data.num_of_pages || 1);
      setTotalComments(
        (data.product_feedbacks || []).length * (data.num_of_pages || 1)
      );
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast({
        title: "Error",
        description: "Failed to load comments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to comment",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await fetch(`/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          reviewable_type: "products",
          entity_id: productId,
          user_sub: user?.user.sub,
          content: message,
          owner_id: user?.user.sub,
          owner_type: "users",
          rating: 1,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Reset message
      setMessage("");

      // Refresh comments (go to first page after adding a new comment)
      setCurrentPage(1);
      fetchComments(1);

      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const response = await fetch(`/api/products/feedback/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      // Refresh comments on current page
      // If this was the last comment on the page, we might need to go back a page
      fetchComments(
        comments.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage
      );

      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Helper function to check if the current user is the comment owner
  const isCommentOwner = (comment: Comment) => {
    if (!user) return false;

    // Check different possible structures of the user object
    if (
      user.user.sub &&
      user.user.sub === String(comment.user_id)
    ) {
      return true;
    }

    if (
      user.user &&
      user.user.sub &&
      user.user.sub === String(comment.user_id)
    ) {
      return true;
    }

    return false;
  };

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
              <span>Send Comment</span>
            </Button>
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                You need to be logged in to comment
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card
              key={comment.id}
              className={
                comment.user_name === sellerName
                  ? "border-primary/30 bg-primary/5"
                  : ""
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{`${comment.user_name} ${comment.user_surname[0]}.`}</span>
                        {comment.user_name === sellerName && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-primary/10 text-primary border-primary/30"
                          >
                            Seller
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                        {/* Show delete button only for the comment owner */}
                        {isCommentOwner(comment) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Delete comment</span>
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
                <span className="sr-only">Previous page</span>
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md bg-muted/20">
          <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-lg font-medium mb-1">No comments yet</h3>
          <p className="text-sm text-muted-foreground">
            Be the first to ask about this item
          </p>
        </div>
      )}
    </div>
  );
};

export default CommentsSection;