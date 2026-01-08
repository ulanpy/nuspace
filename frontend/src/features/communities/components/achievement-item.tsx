"use client";

import { Badge } from "@/components/atoms/badge";

export type AchievementShape = {
    id: number;
    description: string;
    year: number;
};

interface Props {
    achievement: AchievementShape;
    isRecent: boolean;
}

export function AchievementItem({ achievement, isRecent }: Props) {
    return (
        <div
            className={`flex items-start gap-4 p-5 rounded-lg border transition-colors ${isRecent
                    ? "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800"
                    : "bg-card border-border hover:bg-muted/50"
                }`}
        >
            <div className="flex-shrink-0">
                <div
                    className={`rounded-full flex items-center justify-center ${isRecent ? "w-14 h-14 bg-amber-100 dark:bg-amber-900" : "w-12 h-12 bg-muted"
                        }`}
                >
                    <span className={isRecent ? "text-3xl" : "text-2xl"}>{isRecent ? "🏆" : "🎖️"}</span>
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <p className={`leading-relaxed mb-2 ${isRecent ? "text-base font-medium text-foreground" : "text-base text-muted-foreground"}`}>
                    {achievement.description}
                </p>
                <Badge variant={isRecent ? "secondary" : "outline"} className="text-xs font-semibold">
                    {achievement.year}
                </Badge>
            </div>
        </div>
    );
}
