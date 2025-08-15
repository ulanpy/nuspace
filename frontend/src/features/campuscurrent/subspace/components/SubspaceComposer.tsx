import { useState, useMemo } from "react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import { CommunitySelectionModal } from "@/features/campuscurrent/communities/components/CommunitySelectionModal";
import { useCreatePost } from "@/features/campuscurrent/subspace/api/hooks/useCreatePost";
import type { Community } from "@/features/campuscurrent/types/types";
import { MediaFormat } from "@/features/media/types/types";
import { Users, ArrowRight, User } from "lucide-react";
import { useUser } from "@/hooks/use-user";

export function SubspaceComposer() {
  const [isSelectCommunityOpen, setIsSelectCommunityOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { mutate: createPost, isPending } = useCreatePost();
  const { user } = useUser();

  const canPost = useMemo(() => {
    return !!selectedCommunity && description.trim().length > 0;
  }, [selectedCommunity, description]);

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
        },
      },
    );
  };

  return (
    <Card className="p-6 rounded-xl border bg-card shadow-sm space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Create a Post</h2>
        
        {/* User → Community Relationship Display */}
        {selectedCommunity && user && (
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-background flex items-center justify-center flex-shrink-0">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={`${user.name} ${user.surname}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className="font-medium text-sm">
                {user.name} {user.surname}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-background flex items-center justify-center flex-shrink-0">
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
                    <Users className="h-4 w-4 text-muted-foreground" />
                  );
                })()}
              </div>
              <span className="font-medium text-sm">
                {selectedCommunity.name}
              </span>
            </div>
          </div>
        )}

        {/* Community Selection */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsSelectCommunityOpen(true)}
            className="flex items-center gap-2 h-10"
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
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </span>
                  );
                })()}
                <span className="truncate max-w-[12rem] font-medium">{selectedCommunity.name}</span>
              </span>
            ) : (
              <span className="font-medium">Select community</span>
            )}
          </Button>
          <Input
            placeholder="Add a short title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10"
          />
        </div>
        <textarea
          placeholder="Share what's happening..."
          className="w-full min-h-32 p-4 border rounded-lg bg-background text-base leading-relaxed resize-none"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button 
          disabled={!canPost || isPending} 
          onClick={handleSubmit}
          size="lg"
          className="px-6"
        >
          {isPending ? "Posting..." : "Post"}
        </Button>
      </div>

      <CommunitySelectionModal
        isOpen={isSelectCommunityOpen}
        onClose={() => setIsSelectCommunityOpen(false)}
        onSelect={(c) => setSelectedCommunity(c)}
        selectedCommunityId={selectedCommunity?.id}
      />
    </Card>
  );
}


