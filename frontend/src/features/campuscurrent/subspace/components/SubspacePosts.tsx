import { useState, useEffect } from 'react';
import { usePosts } from '../hooks/usePosts'; // Custom hook for fetching posts
import { useDeletePost } from '../hooks/useDeletePost'; // Custom hook for deleting posts
import { useUpdatePost } from '../hooks/useUpdatePost'; // Custom hook for updating posts
import { FixedSizeList as List } from 'react-window'; // For virtualized list
import { SubspacePost, UpdatePostData} from '../types'; // Assuming SubspacePost type
import { Input } from '@/components/atoms/input';
import { Button } from '@/components/atoms/button';

export const SubspacePosts = () => {
  // Destructuring the data and methods from the usePosts hook
  const {
    posts,
    isLoading,
    isError,
    page,
    setPage,
    size,
    setSize,
    keyword,
    setKeyword,
  } = usePosts({ community_id: null, size: 10 });

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
      setEditPostId(null); // Close the edit form after saving
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value); // Update the search keyword
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading posts</div>;

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100">
      {/* Search Bar */}
      <div className="w-full bg-white p-4 shadow-md flex flex-col items-center">
        <Input
          type="text"
          value={keyword}
          onChange={handleSearchChange}
          className="w-3/4 p-2 border border-gray-300 rounded-lg mb-4"
          placeholder="Search posts..."
        />
      </div>

      {/* Edit Post Modal/Inputs */}
      {editPostId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md w-1/3">
            <h3 className="text-xl">Edit Post</h3>
            <Input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              placeholder="Title"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              placeholder="Description"
            />
            <Button
              onClick={handleSaveEdit}
              className="w-full py-2 mt-4 bg-green-500 text-white rounded-lg"
            >
              Save Changes
            </Button>
            <Button
              onClick={() => setEditPostId(null)}
              className="w-full py-2 mt-2 bg-red-500 text-white rounded-lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="w-full mt-8 p-4 space-y-4">
        <div className="w-full bg-white p-4 shadow-md">
          <h2 className="text-xl font-semibold">Posts</h2>
        </div>

        <div className="w-full bg-white p-4 shadow-md">
          <List
            height={600}
            itemCount={posts?.total_pages || 0}
            itemSize={100}
            width="100%"
          >
            {({ index, style }) => {
              const post = posts[index];
              return (
                <div className="p-4 border-b border-gray-300" style={style}>
                  <div className="font-semibold">{post.title}</div>
                  <p className="text-gray-600">{post.description}</p>
                  <div className="flex space-x-4 mt-2">
                    <Button
                      onClick={() => handleEditClick(post)}
                      className="py-1 px-3 bg-yellow-500 text-white rounded"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteClick(post.id)}
                      className="py-1 px-3 bg-red-500 text-white rounded"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            }}
          </List>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-4">
            <Button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="py-2 px-4 bg-gray-500 text-white rounded-lg"
            >
              Previous
            </Button>
            <Button
              onClick={() => setPage(page + 1)}
              disabled={page === 10} // Replace with the actual max page logic
              className="py-2 px-4 bg-gray-500 text-white rounded-lg"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

