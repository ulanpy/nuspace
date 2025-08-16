import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardHeader } from "@/components/atoms/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/atoms/dropdown-menu";
import { Users, MoreVertical, Edit, Trash2 } from "lucide-react";
import { MediaFormat } from "@/features/media/types/types";
import { SubspacePost } from "@/features/campuscurrent/subspace/types";

interface SubspacePostCardProps {
  post: SubspacePost;
  onEdit: (post: SubspacePost) => void;
  onDelete: (postId: number) => void;
}

export function SubspacePostCard({ post, onEdit, onDelete }: SubspacePostCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Post Creator Info */}
          <div className="flex items-center gap-3">
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

          {/* Three Dots Menu */}
          {(post.permissions?.can_edit || post.permissions?.can_delete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {post.permissions?.can_edit && (
                  <DropdownMenuItem onClick={() => onEdit(post)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {post.permissions?.can_delete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(post.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
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
      </CardContent>
    </Card>
  );
} 