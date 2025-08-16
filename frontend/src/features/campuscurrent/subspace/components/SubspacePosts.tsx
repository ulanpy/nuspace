import { useState } from 'react';
import { InfiniteList } from '@/components/virtual/InfiniteList';
import { useDeletePost } from '@/features/campuscurrent/subspace/api/hooks/useDeletePost';
import { SubspacePost } from '@/features/campuscurrent/subspace/types';
import * as Routes from '@/data/routes';
import { SubspacePostCard } from './SubspacePostCard';
import { SubspaceEditModal } from './SubspaceEditModal';
import { SubspacePostModal } from './SubspacePostModal';
import { Users } from 'lucide-react';

export const SubspacePosts = ({ onCreatePost }: { onCreatePost: () => void }) => {
  const { mutate: deletePost } = useDeletePost();

  const [editingPost, setEditingPost] = useState<SubspacePost | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEditClick = (post: SubspacePost) => {
    setEditingPost(post);
    setShowEditModal(true);
  };

  const handleDeleteClick = (postId: number) => {
    deletePost(postId);
  };

  // Render function for each post
  const renderPost = (post: SubspacePost, index: number) => (
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
      {/* "What's new?" Input Box */}
      {/* <div className="mb-6">
        <Input
          placeholder="What's new?"
          onClick={() => setShowCreateModal(true)}
          readOnly
          className="cursor-pointer"
        />
      </div> */}

      {/* Infinite List */}
      <InfiniteList
        queryKey={["campusCurrent", "posts"]}
        apiEndpoint={`/${Routes.POSTS}`}
        size={10}
        additionalParams={{ community_id: null }}
        renderItem={renderPost}
        renderEmpty={renderEmpty}
        title="SubSpace"
        showSearch={true}
        searchPlaceholder="Search posts..."
        itemCountPlaceholder="Posts"
      />

      {/* Create Post Modal */}
      <SubspacePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
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
    </div>
  );
};