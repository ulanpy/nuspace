"use client";

import { Button } from "@/components/atoms/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/atoms/card";
import { FadeInImage } from "@/components/atoms/fade-in-image";
import { Badge } from "@/components/atoms/badge";
import { VerificationBadge } from "@/components/molecules/verification-badge";
import { MarkdownContent } from '@/components/molecules/markdown-content';
import profilePlaceholder from "@/assets/svg/profile-placeholder.svg";

import { useState } from "react";
import { format } from "date-fns";

import {
  Mail,
  Calendar,
  ExternalLink,
  Settings,
} from "lucide-react";

import { Media } from "@/features/media/types/types";
import { useCommunity } from "@/features/communities/hooks/use-community";

import { CommunityModal } from '@/features/communities/components/community-modal';
import { MediaFormat } from "@/features/media/types/types";

export default function CommunityDetailPage() {
  const {
    community,
    permissions,
    isLoading: isCommunityLoading,
  } = useCommunity();
  const [isEditCommunityModalOpen, setIsEditCommunityModalOpen] =
    useState(false);

  const placeholderSrc =
    typeof profilePlaceholder === "string"
      ? profilePlaceholder
      : profilePlaceholder.src;

  if (isCommunityLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="aspect-video bg-muted rounded-md"></div>
        <div className="h-20 bg-muted rounded-full w-20 -mt-10 ml-4 border-4 border-background"></div>
        <div className="h-6 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-1/4"></div>
        <div className="h-20 bg-muted rounded"></div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">Community not found</h2>
        <p className="text-muted-foreground mt-2">
          The community you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  const banner = community.media?.find(
    (media: Media) =>
      media.entity_type === "communities" &&
      media.media_format === MediaFormat.banner
  );
  const profile = community.media?.find(
    (media: Media) =>
      media.entity_type === "communities" &&
      media.media_format === MediaFormat.profile
  );

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <div className="container px-4 md:px-20 lg:px-32">
          <Card className="mb-6 overflow-hidden shadow-lg relative">
            <div className="relative w-full aspect-video bg-muted">
              {banner?.url ? (
                <FadeInImage
                  src={banner.url}
                  alt={community.name}
                  fill
                  priority
                />
              ) : null}
              <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none"></div>
            </div>

            <div className="relative p-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="-mt-12 md:-mt-16 w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-white overflow-hidden bg-white shadow-xl flex-shrink-0 relative z-20">
                  <FadeInImage
                    src={profile?.url || placeholderSrc}
                    fallbackSrc={placeholderSrc}
                    alt={community.name}
                    fill
                    priority
                  />
                </div>

                <div className="flex-grow text-center md:text-left min-w-0 pt-0 md:pt-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight break-words mb-3 md:mb-2 flex flex-col md:flex-row md:items-center md:gap-2">
                    <span className="w-full md:w-auto break-words" title={community.name}>
                      {community.name}
                    </span>
                    {community.verified && (
                      <VerificationBadge size={14} className="mt-2 md:mt-0 md:flex-shrink-0" />
                    )}
                  </h1>

                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-4">
                    <Badge variant="secondary" className="capitalize font-medium px-3 py-1">
                      {community.category}
                    </Badge>
                    <Badge variant="secondary" className="capitalize font-medium px-3 py-1">
                      {community.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {community.email && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`mailto:${community.email}`}
                          className="text-primary hover:underline"
                        >
                          {community.email}
                        </a>
                      </div>
                    )}
                    {community.established && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Founded {format(new Date(community.established), "PPP")}
                        </span>
                      </div>
                    )}
                    {community.instagram_url && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={community.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Instagram
                        </a>
                      </div>
                    )}
                    {community.telegram_url && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={community.telegram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Telegram
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto md:self-start md:ml-0 md:items-start">
                  {permissions?.can_edit && (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditCommunityModalOpen(true)}
                      className="w-full md:w-56 h-10 px-4 justify-center"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Community
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">About Us</h2>
            </div>
            <div className="p-6">
              <div className="prose max-w-none">
                <MarkdownContent
                  content={community.description}
                  fallback="No description available."
                />
              </div>
            </div>
          </Card>
        </div>
      </main>

      <CommunityModal
        isOpen={isEditCommunityModalOpen}
        onClose={() => setIsEditCommunityModalOpen(false)}
        isEditMode={true}
        community={community}
        permissions={permissions ?? undefined}
      />
    </div>
  );
}
