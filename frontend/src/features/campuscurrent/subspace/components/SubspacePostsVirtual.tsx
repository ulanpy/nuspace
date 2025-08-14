import { useState, useMemo } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useDeletePost } from '@/features/campuscurrent/subspace/api/hooks/useDeletePost';
import { useUpdatePost } from '@/features/campuscurrent/subspace/api/hooks/useUpdatePost';
import { SubspacePost, UpdatePostData} from '@/features/campuscurrent/subspace/types';
import { Input } from '@/components/atoms/input';
import { Button } from '@/components/atoms/button';
import { Users } from 'lucide-react';
import { MediaFormat } from '@/features/media/types/types';
import * as Routes from '@/data/routes';

export const SubspacePostsVirtual = () => {
  const [keyword, setKeyword] = useState("");
  
  // Use virtual infinite scroll hook
  const {
    items: posts,
    isLoading,
    isError,
    isFetchingNextPage,
    keyword: hookKeyword,
    setKeyword: setHookKeyword,
    virtualizer,
    parentRef,
    isVirtualAvailable,
  } = useInfiniteScroll<SubspacePost>({
    queryKey: ["campusCurrent", "posts"],
    apiEndpoint: `/${Routes.POSTS}`,
    size: 10,
    keyword,
    additionalParams: { community_id: null },
    estimateSize: () => 300, // Estimate each post to be 300px tall
    overscan: 3, // Only render 3 items outside viewport
  });

  const { mutate: deletePost } = useDeletePost();
  const { mutate: updatePost } = useUpdatePost();

  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  // Update keyword when search input changes
  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setHookKeyword(value);
  };

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
      setEditPostId(null); // Close the edit form after saving
    }
  };

  const postsList = useMemo(() => {
    return [...posts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [posts]);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading posts</div>;

  return (
    <div className="w-full">
      {editPostId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg">
            <h3 className="text-xl">Edit Post</h3>
            <Input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full mt-2"
              placeholder="Title"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-2 border rounded mt-2"
              placeholder="Description"
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSaveEdit} className="flex-1">Save</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditPostId(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        <h2 className="text-xl font-semibold mb-4">
          SubSpace {isVirtualAvailable ? "(Virtual Scrolling)" : "(Regular Scrolling)"}
        </h2>
        <div className="mb-6">
          <Input
            type="text"
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
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
          <div 
            ref={parentRef}
            className="h-[600px] overflow-auto"
          >
            {isVirtualAvailable && virtualizer ? (
              // Virtual scrolling implementation
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow: any) => {
                  const post = postsList[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="border-b border-border pb-6 last:border-b-0">
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
                            <Button size="sm" variant="outline" onClick={() => handleEditClick(post)}>Edit</Button>
                          )}
                          {post.permissions?.can_delete && (
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(post.id)}>Delete</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Regular scrolling fallback
              <div className="space-y-6">
                {postsList.map((post) => (
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
                        <Button size="sm" variant="outline" onClick={() => handleEditClick(post)}>Edit</Button>
                      )}
                      {post.permissions?.can_delete && (
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(post.id)}>Delete</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isFetchingNextPage && (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">Loading more posts...</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

