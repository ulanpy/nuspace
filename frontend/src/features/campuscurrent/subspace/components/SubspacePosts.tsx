import { useState, useMemo } from 'react';
import { InfiniteList } from '@/components/virtual/InfiniteList';
import { useDeletePost } from '@/features/campuscurrent/subspace/api/hooks/useDeletePost';
import { useUpdatePost } from '@/features/campuscurrent/subspace/api/hooks/useUpdatePost';
import { SubspacePost, UpdatePostData} from '@/features/campuscurrent/subspace/types';
import { Button } from '@/components/atoms/button';
import { Users } from 'lucide-react';
import { MediaFormat } from '@/features/media/types/types';
import * as Routes from '@/data/routes';

export const SubspacePosts = () => {
  const { mutate: deletePost } = useDeletePost();
  const { mutate: updatePost } = useUpdatePost();

  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  const handleEditClick = (post: SubspacePost) => {
    setEditPostId(post.id);
    setEditTitle(post.title);
    setEditDescription(post.description);
  };

  const handleDeleteClick = (postId: number) => {
    deletePost(postId);
  };

  const handleSaveEdit = () => {
    if (editPostId !== null) {
      const updatedData: UpdatePostData = {
        title: editTitle,
        description: editDescription,
      };
      updatePost({ id: editPostId, data: updatedData });
      setEditPostId(null);
    }
  };

  // Render function for each post
  const renderPost = (post: SubspacePost, index: number) => (
    <div key={post.id} className="border-b border-border pb-6 last:border-b-0">
      {/* Post Creator Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
          {post.user?.picture ? (
            <img
              src={post.user.picture}
              alt={`${post.user.name} ${post.user.surname}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <Users className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-base break-words">
            {post.user?.name} {post.user?.surname}
          </div>
          <div className="text-sm text-muted-foreground">
            {new Date(post.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="space-y-3">
        {post.title && (
          <h3 className="text-lg font-semibold break-words leading-tight">
            {post.title}
          </h3>
        )}
        <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-wrap break-words">
          {post.description}
        </p>
      </div>

      {/* Community Badge */}
      {post.community?.name && (
        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full">
            {(() => {
              const profile = (post.community?.media || []).find(
                (m: any) => m.media_format === MediaFormat.profile,
              )?.url;
              return profile ? (
                <img
                  src={profile}
                  alt={post.community?.name || "Community"}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <span className="w-4 h-4 rounded-full bg-background flex items-center justify-center">
                  <Users className="w-3 h-3" />
                </span>
              );
            })()}
            <span className="text-sm text-muted-foreground font-medium">
              {post.community.name}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4">
        {post.permissions?.can_edit && (
          <Button size="sm" variant="outline" onClick={() => handleEditClick(post)}>
            Edit
          </Button>
        )}
        {post.permissions?.can_delete && (
          <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(post.id)}>
            Delete
          </Button>
        )}
      </div>
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
      {/* Edit Modal */}
      {editPostId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg">
            <h3 className="text-xl">Edit Post</h3>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-2"
              placeholder="Title"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-2 border rounded mt-2 h-32 resize-none"
              placeholder="Description"
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSaveEdit} className="flex-1">Save</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditPostId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

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
      />
    </div>
  );
};

