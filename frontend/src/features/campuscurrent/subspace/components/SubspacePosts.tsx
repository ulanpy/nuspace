import { useState, useMemo } from 'react';
import { InfiniteList } from '@/components/virtual/InfiniteList';
import { useDeletePost } from '@/features/campuscurrent/subspace/api/hooks/useDeletePost';
import { useUpdatePost } from '@/features/campuscurrent/subspace/api/hooks/useUpdatePost';
import { SubspacePost, UpdatePostData} from '@/features/campuscurrent/subspace/types';
import { Button } from '@/components/atoms/button';
import { Card } from '@/components/atoms/card';
import { Pagination } from '@/components/molecules/pagination';
import { Users, MoreVertical, Edit, Trash2, Sparkles, X, ArrowRight, User } from 'lucide-react';
import { MediaFormat } from '@/features/media/types/types';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu';

interface SubspacePostsProps {
  onCreatePost?: () => void;
}

export const SubspacePosts = ({ onCreatePost }: SubspacePostsProps) => {
  const [keyword, setKeyword] = useState("");
  const { user } = useUser();
  const { toast } = useToast();
  
  // Destructuring the data and methods from the usePosts hook
  const {
    posts,
    isLoading,
    isError,
    page,
    setPage,
    // size,
    // setSize,
  } = usePosts({ community_id: null, size: 10, keyword });

  const { mutate: deletePost } = useDeletePost();
  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost();

  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editingPost, setEditingPost] = useState<SubspacePost | null>(null);

  const handleEditClick = (post: SubspacePost) => {
    setEditPostId(post.id);
    setEditTitle(post.title);
    setEditDescription(post.description);
    setEditingPost(post);
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
      updatePost(
        { id: editPostId, data: updatedData },
        {
          onSuccess: () => {
            setEditPostId(null);
            setEditingPost(null);
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
        }
      );
    }
  };

  const handleCloseEdit = () => {
    setEditPostId(null);
    setEditingPost(null);
    setEditTitle('');
    setEditDescription('');
  };

  const postsList = useMemo(() => {
    const list = posts?.posts ?? [];
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [posts]);

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
      {editPostId !== null && editingPost && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleCloseEdit}
          />
          
          {/* Modal Content */}
          <div className="fixed inset-0 z-[9999] transition-transform duration-300 ease-out">
            <div className="h-full bg-background">
              {/* Header */}
              <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <Button variant="ghost" onClick={handleCloseEdit} className="text-muted-foreground">
                  <X className="h-4 w-4" />
                </Button>
                <div className="w-10"></div>
              </div>
              
              {/* Content */}
              <div className="h-full overflow-y-auto p-4">
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Title */}
                  <div className="pt-8">
                    <h2 className="text-xl font-semibold">Edit Post</h2>
                  </div>

                  {/* User → Community Relationship Display */}
                  {editingPost.community && user && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                            {user.user?.picture ? (
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
                            {user.user?.name} {user.user?.family_name}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                            {(() => {
                              const profile = (editingPost.community?.media || []).find(
                                (m) => m.media_format === MediaFormat.profile,
                              )?.url;
                              return profile ? (
                                <img
                                  src={profile}
                                  alt={editingPost.community?.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Users className="h-4 w-4 text-primary" />
                              );
                            })()}
                          </div>
                          <span className="font-medium text-sm">
                            {editingPost.community?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Community Selection (Read-only) */}
                  <div className="space-y-2">
                    <label className="text-base font-medium text-foreground">Community</label>
                    <div className="w-full p-3 border rounded-lg bg-muted/20 cursor-not-allowed">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        {(() => {
                          const profile = (editingPost.community?.media || []).find(
                            (m) => m.media_format === MediaFormat.profile,
                          )?.url;
                          return profile ? (
                            <img
                              src={profile}
                              alt={editingPost.community?.name || "Community"}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-background flex items-center justify-center">
                              <Users className="w-3 h-3" />
                            </span>
                          );
                        })()}
                        <span className="font-medium">{editingPost.community?.name}</span>
                        <span className="text-xs text-muted-foreground">(Cannot be changed)</span>
                      </span>
                    </div>
                  </div>

                  {/* Title Input */}
                  <div className="space-y-2">
                    <label className="text-base font-medium text-foreground">Title (optional)</label>
                    <Input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Add a short title..."
                      className="h-10"
                    />
                  </div>

                  {/* Description Input */}
                  <div className="space-y-2">
                    <label className="text-base font-medium text-foreground">Post content</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Share what's happening..."
                      className="w-full min-h-32 p-4 border rounded-lg bg-background text-base leading-relaxed resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={handleCloseEdit}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveEdit}
                      disabled={!editDescription.trim() || isUpdating}
                      className="flex-1"
                    >
                      {isUpdating ? "Updating..." : "Update Post"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Card className="p-6 rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">SubSpace</h2>
          </div>
          <Button
              variant="ghost"
              size="sm"
              onClick={onCreatePost}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
            >
              <Sparkles className="h-4 w-4" />
              <span>What's new?</span>
            </Button>
        </div>
        <div className="mb-6">
          <Input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search posts..."
            className="h-10"
          />
        </div>
        {postsList.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No posts yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Be the first to share what's happening in your community.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {postsList.map((post) => (
              <div key={post.id} className="border-b border-border pb-6 last:border-b-0">
                {/* Post Creator Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 scale-95 md:scale-100">
                    {post.user?.picture ? (
                      <img
                        src={post.user.picture}
                        alt={`${post.user.name} ${post.user.surname}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-6 w-6 md:h-6 md:w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-base md:text-base break-words scale-90 md:scale-100">
                      {post.user?.name} {post.user?.surname}
                    </div>
                    <div className="text-sm md:text-sm text-muted-foreground scale-90 md:scale-100">
                      {new Date(post.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Three dots menu for edit/delete */}
                  {(post.permissions?.can_edit || post.permissions?.can_delete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 scale-95 md:scale-100">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {post.permissions?.can_edit && (
                          <DropdownMenuItem onClick={() => handleEditClick(post)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                        )}
                        {post.permissions?.can_delete && (
                          <DropdownMenuItem onClick={() => handleDeleteClick(post.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Post Content */}
                <div className="space-y-3">
                  {post.title && (
                    <h3 className="text-lg md:text-lg font-semibold break-words leading-tight scale-95 md:scale-100">
                      {post.title}
                    </h3>
                  )}
                  <p className="text-muted-foreground text-base md:text-base leading-relaxed whitespace-pre-wrap break-words scale-95 md:scale-100">
                    {post.description}
                  </p>
                </div>

                {/* Community Badge */}
                {post.community?.name && (
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full scale-95 md:scale-100">
                      {(() => {
                        const profile = (post.community?.media || []).find(
                          (m) => m.media_format === MediaFormat.profile,
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
              </div>
            ))}
          </div>
        )}

        {posts && posts.total_pages > 1 && (
          <div className="mt-4">
            <Pagination length={posts.total_pages} currentPage={page} onChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
};

