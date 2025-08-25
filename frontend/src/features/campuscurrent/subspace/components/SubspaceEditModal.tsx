import { useState, useEffect } from "react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { useUpdatePost } from "@/features/campuscurrent/subspace/api/hooks/useUpdatePost";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { SubspacePost, UpdatePostData } from "@/features/campuscurrent/subspace/types";
import { X } from "lucide-react";

interface SubspaceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: SubspacePost | null;
}

export function SubspaceEditModal({ isOpen, onClose, post }: SubspaceEditModalProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { mutate: updatePost, isPending } = useUpdatePost();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Reset form when post changes
  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setDescription(post.description || "");
    }
  }, [post]);

  const handleSubmit = () => {
    if (!post) return;
    
    const updatedData: UpdatePostData = {
      title: title.trim() || undefined,
      description: description.trim(),
    };

    updatePost(
      { id: post.id, data: updatedData },
      {
        onSuccess: () => {
          onClose();
          toast({
            title: "Post updated successfully",
            description: "Your post has been updated.",
          });
        },
        onError: () => {
          toast({
            title: "Failed to update post",
            description: "Please try again later.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    onClose();
  };

  if (!user || !post) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-in fade-in-50 zoom-in-95">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-border flex-shrink-0">
            <h2 className="text-xl font-semibold">Edit Post</h2>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Title (optional)</label>
              <Input
                placeholder="Add a short title for your post..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Post content</label>
              <textarea
                placeholder="Share what's happening..."
                className="w-full min-h-32 p-3 bg-background rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border border-input text-base leading-relaxed"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 pb-2 sm:pb-0">
              <Button variant="outline" onClick={handleClose} className="order-2 sm:order-1">
                Cancel
              </Button>
              <Button 
                disabled={!description.trim() || isPending} 
                onClick={handleSubmit}
                size="lg"
                className="order-1 sm:order-2"
              >
                {isPending ? "Updating..." : "Update Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 