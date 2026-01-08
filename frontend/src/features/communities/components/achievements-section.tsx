"use client";

import React from "react";
import { Card } from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import { Settings } from "lucide-react";
import { useInfiniteAchievements, Achievement as AchievementType } from "@/features/communities/hooks/use-infinite-achievements";
import { AchievementItem } from "./achievement-item";

interface AchievementsSectionProps {
  communityId: number;
  canEdit: boolean;
  onEditAchievements: () => void;
}

/**
 * Important notes on hook usage:
 * - `useInfiniteAchievements` returns {...result, achievements: result.items}
 * - `useInfiniteScroll` returns:
 *    items, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, keyword, setKeyword, loadMoreRef
 *
 * We use the properties that matter for rendering:
 * - achievements (array) -> items to render
 * - isLoading -> initial loading state
 * - isFetchingNextPage -> subsequent pages loading (shows "Loading more...")
 * - hasNextPage -> whether to render the sentinel div with ref
 * - loadMoreRef -> intersection observer ref callback from your hook to auto load more
 */

export function AchievementsSection({ communityId, canEdit, onEditAchievements }: AchievementsSectionProps) {
  const {
    achievements: allLoadedAchievements = [],
    isLoading = false,
    isError = false,
    isFetchingNextPage = false,
    hasNextPage = false,
    loadMoreRef = null,
  } = useInfiniteAchievements({ communityId });

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-6 border-b flex justify-between items-center">
        <h2 className="text-2xl font-bold">Achievements</h2>

        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEditAchievements}
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit Achievements
          </Button>
        )}

      </div>

      <div className="p-6">
        {isLoading && allLoadedAchievements.length === 0 ? (
          <EmptyState icon="⏳" title="Loading achievements..." />
        ) : allLoadedAchievements.length === 0 ? (
          <EmptyState
            icon="🏆"
            title="No Achievements Yet"
            description={
              canEdit
                ? "Click 'Edit Achievements' to add the community's accomplishments and awards."
                : "This community hasn't added any achievements yet."
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {allLoadedAchievements.map((achievement: AchievementType) => {
                const isRecent = achievement.year === currentYear || achievement.year === lastYear;
                return <AchievementItem key={achievement.id} achievement={achievement} isRecent={isRecent} />;
              })}
            </div>

            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center pt-4">
                {isFetchingNextPage && <div className="text-muted-foreground text-sm">Loading more...</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/* -------------------------
   EmptyState helper
   - Kept in this file to avoid an extra file for one small component.
   - If EmptyState is reused across multiple sections, move it to e.g. components/ui/EmptyState.tsx
------------------------- */
function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {description && <p className="text-muted-foreground max-w-md mx-auto">{description}</p>}
    </div>
  );
}
