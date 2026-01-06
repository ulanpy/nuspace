"use client";

import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import { ThemeToggle } from "@/components/molecules/theme-toggle";
import { SnowToggle } from "@/components/molecules/snow-toggle";
import { BindTelegramButton } from "@/components/molecules/buttons/bind-telegram-button";
import { TelegramStatus } from "@/components/molecules/telegram-status";
import { LogOut, User, Users, Plus } from "lucide-react";
import { useUserCommunities } from "@/features/communities/hooks/use-user-communities";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/data/routes";
import { Community } from "@/features/shared/campus/types";
import { MediaFormat } from "@/features/media/types/types";
import profilePlaceholder from "@/assets/svg/profile-placeholder.svg";
import { useState } from "react";
import { CommunityModal } from '@/features/communities/components/community-modal';

export default function ProfilePage() {
    const { user, isLoading, logout, login } = useUser();
    const router = useRouter();
    const { communities } = useUserCommunities(user?.user?.sub);
    const [isCreateCommunityModalOpen, setIsCreateCommunityModalOpen] = useState(false);


    return (
        <div className="max-w-xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Profile</h1>
            </div>

            <Card>
                <CardHeader className="p-4 pb-3">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                            {user?.user?.picture ? (
                                <img src={user.user.picture} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="h-6 w-6 text-muted-foreground" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="font-semibold truncate">
                                {isLoading ? "Loading..." : user?.user?.given_name || user?.user?.name || "Guest"}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                                {user?.user?.email || "Not signed in"}
                            </div>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            {user ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="inline-flex items-center gap-2"
                                    onClick={() => logout()}
                                >
                                    <LogOut size={16} /> Logout
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" onClick={() => login()}>
                                    Login
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardFooter className="p-4 pt-3 border-t">
                    <div className="flex items-center justify-between w-full">
                        <div className="text-sm text-muted-foreground">Appearance</div>
                        <div className="flex gap-3">
                            <ThemeToggle />
                            <SnowToggle />
                        </div>
                    </div>
                </CardFooter>
                {user && (
                    <CardContent className="p-4 pt-0">
                        <div className="border-t pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm">Telegram</div>
                                {user?.tg_id ? <TelegramStatus isConnected /> : <BindTelegramButton />}
                            </div>

                            {/* My Communities Section */}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">My Communities</div>
                                </div>
                                {communities.length > 0 ? (
                                    <div className="mt-3 space-y-2">
                                        {communities.slice(0, 3).map((community: Community) => {
                                            const profile = community.media?.find(
                                                (media) => media.media_format === MediaFormat.profile
                                            );

                                            return (
                                                <Button
                                                    key={community.id}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-start text-left h-auto py-2"
                                                    onClick={() => router.push(ROUTES.COMMUNITIES.DETAIL_FN(community.id.toString()))}
                                                >
                                                    <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0 bg-muted flex items-center justify-center">
                                                        {profile?.url ? (
                                                            <img
                                                                src={profile.url}
                                                                onError={(e) => {
                                                                    e.currentTarget.src = profilePlaceholder;
                                                                }}
                                                                alt={community.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Users className="h-3 w-3 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">{community.name}</div>
                                                        <div className="text-xs text-muted-foreground capitalize">
                                                            {community.category} • {community.type}
                                                        </div>
                                                    </div>
                                                </Button>
                                            );
                                        })}
                                        {communities.length > 3 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => router.push(ROUTES.COMMUNITIES.ROOT)}
                                            >
                                                View all {communities.length} communities
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => setIsCreateCommunityModalOpen(true)}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Community
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                )}

            </Card>

            {/* Create Community Modal */}
            <CommunityModal
                isOpen={isCreateCommunityModalOpen}
                onClose={() => setIsCreateCommunityModalOpen(false)}
                isEditMode={false}
            />
        </div>
    );
}
