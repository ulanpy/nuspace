"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Building2, CalendarDays, Instagram, Mail, Send, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { VerificationBadge } from "@/components/molecules/verification-badge";
import { MarkdownContent } from "@/components/molecules/markdown-content";
import { MediaFormat } from "@/features/media/types/types";
import type { Media } from "@/features/media/types/types";
import { useCommunity } from "@/features/communities/hooks/use-community";
import { CommunityModal } from "@/features/communities/components/community-modal";

export default function CommunityDetailPage() {
  const { community, permissions, isLoading: isCommunityLoading } = useCommunity();
  const [isEditCommunityModalOpen, setIsEditCommunityModalOpen] = useState(false);

  if (isCommunityLoading) return <CommunityDetailSkeleton />;

  if (!community) {
    return (
      <PageContainer padding="default">
        <div className="py-12 text-center">
          <h2 className="text-xl font-bold">Club not found</h2>
          <p className="mt-2 text-muted-foreground">The club you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        </div>
      </PageContainer>
    );
  }

  const profile = community.media?.find(
    (media: Media) => media.entity_type === "communities" && media.media_format === MediaFormat.profile,
  );
  const banner = community.media?.find(
    (media: Media) => media.entity_type === "communities" && media.media_format === MediaFormat.banner,
  );
  const description = community.description.replace(/^ {1,4}/gm, "");

  return (
    <PageContainer padding="default">
      <div className="community-wiki-layout">
        <aside className="community-wiki-sidebar space-y-4">
          <Card className="overflow-visible">
            <div className="relative h-24 bg-muted sm:h-28">
              <div className="absolute inset-0 overflow-hidden rounded-t-lg">
                {banner?.url && (
                  <img src={banner.url} alt={`${community.name} banner`} className="block h-full w-full object-cover" />
                )}
              </div>
              <div className="absolute bottom-[-28px] left-4 z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border-4 border-card bg-muted">
                {profile?.url ? (
                  <img src={profile.url} alt="" width={56} height={56} className="block h-full w-full object-cover" />
                ) : (
                  <Building2 className="size-6 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
            </div>
            <CardContent className="relative p-4 pt-10">
              {permissions?.can_edit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-4 right-4"
                  onClick={() => setIsEditCommunityModalOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
              <div className="mt-0 flex items-center gap-1.5">
                <h1 className="min-w-0 break-all text-lg font-bold leading-tight">{community.name}</h1>
                {community.verified && <VerificationBadge size={14} className="shrink-0" />}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="capitalize">{community.category}</Badge>
                <Badge variant="outline" className="capitalize">{community.type}</Badge>
              </div>
              {community.established && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" /> Founded {format(new Date(community.established), "yyyy")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-0"><h2 className="text-sm font-semibold">Contact</h2></CardHeader>
            <CardContent className="grid gap-2 p-4">
              {community.telegram_url && (
                <Button asChild className="w-full justify-start gap-2">
                  <a href={community.telegram_url} target="_blank" rel="noopener noreferrer">
                    <Send className="h-4 w-4" /> Telegram
                  </a>
                </Button>
              )}
              {community.instagram_url && (
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <a href={community.instagram_url} target="_blank" rel="noopener noreferrer">
                    <Instagram className="h-4 w-4" /> Instagram
                  </a>
                </Button>
              )}
              {community.email && (
                <Button asChild variant="outline" className="w-full min-w-0 justify-start gap-2">
                  <a href={`mailto:${community.email}`} className="min-w-0">
                    <Mail className="h-4 w-4" />
                    <span className="min-w-0 truncate">{community.email}</span>
                  </a>
                </Button>
              )}
              {!community.telegram_url && !community.instagram_url && !community.email && (
                <p className="text-sm text-muted-foreground">No public contact details yet.</p>
              )}
            </CardContent>
          </Card>
        </aside>

        <Card className="community-wiki-article min-w-0">
          <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0"><h2 className="text-lg font-semibold">About</h2></CardHeader>
          <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
            <div className="prose max-w-none text-sm sm:text-base">
              <MarkdownContent content={description} fallback="No description available." />
            </div>
          </CardContent>
        </Card>

      </div>

      <CommunityModal
        isOpen={isEditCommunityModalOpen}
        onClose={() => setIsEditCommunityModalOpen(false)}
        isEditMode
        community={community}
        permissions={permissions ?? undefined}
      />
    </PageContainer>
  );
}

function CommunityDetailSkeleton() {
  return (
    <PageContainer maxWidth="wide" padding="default">
      <div className="animate-pulse space-y-4">
        <div className="h-24 rounded-lg bg-muted" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="h-64 rounded-lg bg-muted" />
          <div className="h-44 rounded-lg bg-muted" />
        </div>
      </div>
    </PageContainer>
  );
}
