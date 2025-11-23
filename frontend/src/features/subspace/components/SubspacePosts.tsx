import { useState } from 'react';
import { SearchableInfiniteList } from '@/components/virtual/SearchableInfiniteList';
import { useDeletePost } from '@/features/subspace/api/hooks/useDeletePost';
import { SubspacePost } from '@/features/subspace/types';
import * as Routes from '@/data/routes';
import { SubspacePostCard } from './SubspacePostCard';
import { SubspaceEditModal } from './SubspaceEditModal';
import { Users, Filter, X, PenSquare } from 'lucide-react';
import { usePreSearchPosts } from '@/features/subspace/api/hooks/usePreSearchPosts';
import { CommunitySelectionModal } from '@/features/communities/components/CommunitySelectionModal';
import { useCommunities } from '@/features/communities/hooks/use-communities';
import { Community } from '@/features/shared/campus/types';
import { Button } from '@/components/atoms/button';

interface SubspacePostsProps {
  onCreatePost: () => void;
}

export const SubspacePosts = ({ onCreatePost }: SubspacePostsProps) => {
  const { mutate: deletePost } = useDeletePost();

  const [editingPost, setEditingPost] = useState<SubspacePost | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  
  // Get communities for the filter
  const { communities } = useCommunities();

  const handleEditClick = (post: SubspacePost) => {
    setEditingPost(post);
    setShowEditModal(true);
  };

  const handleDeleteClick = (postId: number) => {
    deletePost(postId);
  };

  // Handle community selection
  const handleCommunitySelect = (community: Community) => {
    setSelectedCommunityId(community.id);
    setShowCommunityModal(false);
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
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Subspace</h1>
            <p className="text-gray-600 dark:text-gray-400">Share updates and conversations across NU communities</p>
          </div>
          <Button
            onClick={onCreatePost}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <PenSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Create Post</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>

        <div className="mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
            <Button
              variant={selectedCommunity ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCommunityModal(true)}
              className={`
                flex-shrink-0 h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm gap-1 sm:gap-2
                ${selectedCommunity
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-sm"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"}
              `}
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{selectedCommunity ? selectedCommunity.name : "Community"}</span>
              <span className="sm:hidden">{selectedCommunity ? selectedCommunity.name.slice(0, 8) + (selectedCommunity.name.length > 8 ? "…" : "") : "Community"}</span>
            </Button>
          </div>

          {selectedCommunity && (
            <div className="flex flex-wrap gap-2 mt-3">
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                <Users className="h-3 w-3" />
                <span className="max-w-24 truncate">{selectedCommunity.name}</span>
                <button
                  onClick={handleRemoveCommunityFilter}
                  className="ml-1 hover:text-blue-600 dark:hover:text-blue-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
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

      {/* Edit Post Modal */}
      <SubspaceEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPost(null);
        }}
        post={editingPost}
      />

      {/* Community Selection Modal */}
      <CommunitySelectionModal
        isOpen={showCommunityModal}
        onClose={() => {
          setShowCommunityModal(false);
        }}
        onSelect={handleCommunitySelect}
        selectedCommunityId={selectedCommunityId ?? undefined}
      />
    </div>
  );
};