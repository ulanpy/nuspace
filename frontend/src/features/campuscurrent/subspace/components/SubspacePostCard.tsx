import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardHeader } from "@/components/atoms/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/atoms/dropdown-menu";
import { Users, MoreVertical, Edit, Trash2, ArrowRight, Edit3, ChevronDown, ChevronUp } from "lucide-react";
import { MediaFormat } from "@/features/media/types/types";
import { SubspacePost } from "@/features/campuscurrent/subspace/types";
import { Link } from "react-router-dom";
import { ROUTES } from "@/data/routes";

interface SubspacePostCardProps {
  post: SubspacePost;
  onEdit: (post: SubspacePost) => void;
  onDelete: (postId: number) => void;
}

// Utility function to format relative time
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  // Parse UTC timestamp and convert to local time
  const date = new Date(dateString + 'Z'); // Add 'Z' to indicate UTC
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays}d ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears}y ago`;
}

// Check if post was edited (updated timestamp differs from created by more than 2 seconds)
function isPostEdited(post: SubspacePost): boolean {
  const createdTime = new Date(post.created_at + 'Z').getTime(); // Parse as UTC
  const updatedTime = new Date(post.updated_at + 'Z').getTime(); // Parse as UTC
  const diffInSeconds = Math.abs(updatedTime - createdTime) / 1000;
  return diffInSeconds > 2;
}

// Utility function to format datetime for display
function formatDateTime(dateString: string): string {
  // Parse UTC timestamp and convert to local time
  const date = new Date(dateString + 'Z'); // Add 'Z' to indicate UTC
  
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  return `${dateStr} • ${timeStr}`;
}

export function SubspacePostCard({ post, onEdit, onDelete }: SubspacePostCardProps) {
  const wasEdited = isPostEdited(post);
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = post.description.length > 300;
  const displayText = isExpanded ? post.description : post.description.slice(0, 300);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* User Info */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {post.user?.picture ? (
                <img
                  src={post.user.picture}
                  alt={`${post.user.name} ${post.user.surname}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-base break-words">
                {post.user?.name} {post.user?.surname}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatRelativeTime(post.created_at)}
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

        {/* Unified User → Community Relationship */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">posted to</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Link 
            to={ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(String(post.community?.id))}
            className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {(() => {
                const profile = (post.community?.media || []).find(
                  (m: any) => m.media_format === MediaFormat.profile,
                )?.url;
                return profile ? (
                  <img
                    src={profile}
                    alt={post.community?.name || "Community"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="h-3 w-3 text-muted-foreground" />
                );
              })()}
            </div>
            <span className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
              {post.community?.name || "Community"}
            </span>
          </Link>
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
          <div className="space-y-2">
            <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-wrap break-words">
              {displayText}
              {shouldTruncate && !isExpanded && (
                <span className="text-muted-foreground/70">...</span>
              )}
            </p>
            {shouldTruncate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-auto p-0 text-sm text-primary hover:text-primary/80"
              >
                {isExpanded ? (
                  <>
                    Show less <ChevronUp className="ml-1 h-3 w-3" />
                  </>
                ) : (
                  <>
                    Show more <ChevronDown className="ml-1 h-3 w-3" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Exact datetime indicator */}
        <div className="flex justify-end items-center gap-3 mt-4 pt-3 border-t">
          <span className="text-xs text-muted-foreground/70 font-medium" title={new Date(post.created_at).toLocaleString()}>
            {formatDateTime(post.created_at)}
          </span>
          {wasEdited && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <Edit3 className="h-3 w-3" />
              <span>edited</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 