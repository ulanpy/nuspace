import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Card } from "@/components/atoms/card";
import { useCreatePost } from "@/features/campuscurrent/subspace/api/hooks/useCreatePost";
import { CommunitySelectionModal } from "@/features/campuscurrent/communities/components/CommunitySelectionModal";
import { useUser } from "@/hooks/use-user";
import { LoginModal } from "@/components/molecules/login-modal";
import { useToast } from "@/hooks/use-toast";
import type { Community } from "@/features/campuscurrent/types/types";
import { MediaFormat } from "@/features/media/types/types";
import { Users, ArrowRight, User, X } from "lucide-react";

interface SubspacePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubspacePostModal({ isOpen, onClose }: SubspacePostModalProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { mutate: createPost, isPending } = useCreatePost();
  
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const canPost = selectedCommunity && description.trim().length > 0;

  const handleSubmit = () => {
    if (!selectedCommunity) return;
    
    const finalTitle = title.trim() || description.trim().slice(0, 80);
    createPost(
      {
        community_id: selectedCommunity.id,
        title: finalTitle,
        description: description.trim(),
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setSelectedCommunity(null);
          onClose();
          toast({
            title: "Post created successfully",
            description: "Your post has been published to the community.",
          });
        },
        onError: () => {
          toast({
            title: "Failed to create post",
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
    setSelectedCommunity(null);
    onClose();
  };

  if (!user) {
    return (
      <LoginModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onClose}
        title="Login Required"
        message="You need to be logged in to create posts."
      />
    );
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
        className={`fixed inset-0 z-[9999] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="h-full bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Button variant="ghost" onClick={handleClose} className="text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
          <div className="w-10"></div>
        </div>
        
        {/* Content */}
        <div className="h-full overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Title moved below header */}
            <div className="pt-8">
              <h2 className="text-xl font-semibold">Create Post</h2>
            </div>
            {/* User → Community Relationship Display */}
            {selectedCommunity && user && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                      {user.user.picture ? (
                        <img
                          src={user.user.picture}
                          alt={`${user.user.name} ${user.user.family_name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <span className="font-medium text-sm">
                      {user.user.name} {user.user.family_name}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                      {(() => {
                        const profile = (selectedCommunity.media || []).find(
                          (m) => m.media_format === MediaFormat.profile,
                        )?.url;
                        return profile ? (
                          <img
                            src={profile}
                            alt={selectedCommunity.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-4 w-4 text-primary" />
                        );
                      })()}
                    </div>
                    <span className="font-medium text-sm">
                      {selectedCommunity.name}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Community Selection */}
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Community</label>
              <Button
                variant="outline"
                onClick={() => setShowCommunityModal(true)}
                className="w-full justify-start h-10"
              >
                {selectedCommunity ? (
                  <span className="inline-flex items-center gap-2">
                    {(() => {
                      const profile = (selectedCommunity.media || []).find(
                        (m) => m.media_format === MediaFormat.profile,
                      )?.url;
                      return profile ? (
                        <img
                          src={profile}
                          alt={selectedCommunity.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-3 h-3" />
                        </span>
                      );
                    })()}
                    <span className="font-medium">{selectedCommunity.name}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select a community</span>
                )}
              </Button>
            </div>

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
             <div className="flex justify-end gap-3 pt-4">
               <Button variant="outline" onClick={handleClose}>
                 Cancel
               </Button>
               <Button 
                 disabled={!canPost || isPending} 
                 onClick={handleSubmit}
                 size="lg"
               >
                 {isPending ? "Creating..." : "Post"}
               </Button>
             </div>
           </div>
         </div>
       </div>
     </div>

     {/* Community Selection Modal */}
     <CommunitySelectionModal
       isOpen={showCommunityModal}
       onClose={() => setShowCommunityModal(false)}
       onSelect={(community) => {
         setSelectedCommunity(community);
         setShowCommunityModal(false);
       }}
       selectedCommunityId={selectedCommunity?.id}
     />
   </>
 );
}
