"use client";

import { ExternalLink, MessageCircle } from "lucide-react";
import { useTelegramPosts } from '@/features/announcements/api/use-telegram-posts';
import { TelegramWidget } from './telegram-widget';

export function TelegramFeed() {
    const { data: latestId, isLoading } = useTelegramPosts();

    if (isLoading) {
        return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
    }

    if (!latestId) {
        return (
            <div className="p-8 text-center rounded-xl border bg-card">
                <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No recent announcements</p>
                <a
                    href="https://t.me/nuspacechannel"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
                >
                    Visit Telegram Channel <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        );
    }

    // Get last 5 post IDs
    const postIds = Array.from({ length: 5 }, (_, i) => String(latestId - i));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Latest from Telegram</h2>
                <a
                    href="https://t.me/nuspacechannel"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                    View channel <ExternalLink className="w-4 h-4" />
                </a>
            </div>

            <div className="space-y-4 max-h-[539px] overflow-y-auto pr-2 rounded-xl border bg-card p-4">
                {postIds.map((id) => (
                    <div key={id} className="flex justify-center">
                        <TelegramWidget postId={id} />
                    </div>
                ))}
            </div>
        </div>
    );
}
