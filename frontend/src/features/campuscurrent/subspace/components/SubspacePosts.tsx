import { useState } from 'react';
import { SearchableInfiniteList } from '@/components/virtual/SearchableInfiniteList';
import { useDeletePost } from '@/features/campuscurrent/subspace/api/hooks/useDeletePost';
import { SubspacePost } from '@/features/campuscurrent/subspace/types';
import * as Routes from '@/data/routes';
import { SubspacePostCard } from './SubspacePostCard';
import { SubspaceEditModal } from './SubspaceEditModal';
import { SubspacePostModal } from './SubspacePostModal';
import { Users, Filter, X } from 'lucide-react';
import { usePreSearchPosts } from '@/features/campuscurrent/subspace/api/hooks/usePreSearchPosts';
import { CommunitySelectionModal } from '@/features/campuscurrent/communities/components/CommunitySelectionModal';
import { useCommunities } from '@/features/campuscurrent/communities/hooks/use-communities';
import { Community } from '@/features/campuscurrent/types/types';

export const SubspacePosts = ({ 
  onCreatePost: _onCreatePost,
  onModalStateChange
}: { 
  onCreatePost: () => void;
  onModalStateChange?: (isModalOpen: boolean) => void;
}) => {
  const { mutate: deletePost } = useDeletePost();

  const [editingPost, setEditingPost] = useState<SubspacePost | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  
  // Get communities for the filter
  const { communities } = useCommunities();

  // Notify parent when modal state changes
  const notifyModalStateChange = (isOpen: boolean) => {
    onModalStateChange?.(isOpen);
  };

  const handleEditClick = (post: SubspacePost) => {
    setEditingPost(post);
    setShowEditModal(true);
    notifyModalStateChange(true);
  };

  const handleDeleteClick = (postId: number) => {
    deletePost(postId);
  };

  // Handle community selection
  const handleCommunitySelect = (community: Community) => {
    setSelectedCommunityId(community.id);
    setShowCommunityModal(false);
    notifyModalStateChange(false);
  };

  // Handle community filter removal
  const handleRemoveCommunityFilter = () => {
    setSelectedCommunityId(null);
  };

  // Get selected community name
  const selectedCommunity = communities?.communities?.find(c => c.id === selectedCommunityId);

  // Render function for each post
  const renderPost = (post: SubspacePost) => (
    <div key={post.id} className="mb-6">
      <SubspacePostCard
        post={post}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />
    </div>
  );

  // Custom empty state
  const renderEmpty = () => (
    <div className="text-center py-12">
      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">No posts yet</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Be the first to share what's happening in your community.
      </p>
    </div>
  );

  return (
    <div className="w-full">
      {/* Production Ready Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">SubSpace</h1>
            <div className="flex items-center gap-2">
              {selectedCommunity ? (
                // Show selected community with remove button
                <div className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg max-w-[200px]">
                  <span className="text-blue-700 dark:text-blue-300 font-medium truncate">
                    {selectedCommunity.name}
                  </span>
                  <button
                    onClick={handleRemoveCommunityFilter}
                    className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex-shrink-0"
                    title="Remove filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                // Show filter button when no community selected
                <button
                  onClick={() => setShowCommunityModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter by Community</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Infinite List */}
      <SearchableInfiniteList
        queryKey={["campusCurrent", "posts"]}
        apiEndpoint={`/${Routes.POSTS}`}
        size={10}
        additionalParams={{ community_id: selectedCommunityId }}
        renderItem={renderPost}
        renderEmpty={renderEmpty}
        title={undefined} // We handle title in our custom header
        searchPlaceholder="Search posts..."
        itemCountPlaceholder="Posts"
        usePreSearch={usePreSearchPosts}
      />

      {/* Create Post Modal */}
      <SubspacePostModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          notifyModalStateChange(false);
        }}
      />

      {/* Edit Post Modal */}
      <SubspaceEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPost(null);
          notifyModalStateChange(false);
        }}
        post={editingPost}
      />

      {/* Community Selection Modal */}
      <CommunitySelectionModal
        isOpen={showCommunityModal}
        onClose={() => {
          setShowCommunityModal(false);
          notifyModalStateChange(false);
        }}
        onSelect={handleCommunitySelect}
        selectedCommunityId={selectedCommunityId ?? undefined}
      />
    </div>
  );
};