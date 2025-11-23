import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { useCreatePost } from "@/features/subspace/api/hooks/useCreatePost";
import { CommunitySelectionModal } from "@/features/communities/components/CommunitySelectionModal";
import { Modal } from "@/components/atoms/modal";
import { useUser } from "@/hooks/use-user";
import { LoginModal } from "@/components/molecules/login-modal";
import { useToast } from "@/hooks/use-toast";
import type { Community } from "@/features/shared/campus/types";
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
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const canPost = selectedCommunity && description.trim().length > 0;

  const handleSubmit = () => {
    if (!selectedCommunity) return;
    
    const finalTitle = title.trim() || description.trim().slice(0, 80);
    createPost(
      {
        community_id: selectedCommunity.id,
        title: finalTitle,
        description: description.trim(),
        media: mediaFiles,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setSelectedCommunity(null);
          setMediaFiles([]);
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

  const handleMediaChange = (files: File[]) => {
    setMediaFiles(files);
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setSelectedCommunity(null);
    setMediaFiles([]);
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
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Create Post"
        className="max-w-2xl"
      >
        <div className="space-y-6">
          {/* Unified User → Community Selection */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">Posting to</label>
            <Button
              variant="outline"
              onClick={() => setShowCommunityModal(true)}
              className="w-full justify-start h-12 p-3"
            >
                {selectedCommunity ? (
                  <div className="flex items-center gap-3 w-full">
                    {/* User Info */}
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
                        {user.user.given_name || user.user.name} {user.user.family_name || user.user.surname}
                      </span>
                    </div>
                    
                    {/* Arrow */}
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    {/* Community Info */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
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
                      <span className="font-medium text-sm truncate">
                        {selectedCommunity.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 w-full">
                    {/* User Info */}
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
                        {user.user.given_name || user.user.name} {user.user.family_name || user.user.surname}
                      </span>
                    </div>
                    
                    {/* Arrow */}
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    {/* Placeholder */}
                    <span className="text-muted-foreground text-sm">Select a community</span>
                  </div>
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
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleClose} className="order-2 sm:order-1">
              Cancel
            </Button>
            <Button 
              disabled={!canPost || isPending} 
              onClick={handleSubmit}
              className="order-1 sm:order-2 min-w-[120px]"
            >
              {isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

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
