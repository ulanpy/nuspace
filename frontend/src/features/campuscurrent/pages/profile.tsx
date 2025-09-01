import {useUser} from "@/hooks/use-user";
import {Card, CardContent, CardFooter, CardHeader} from "@/components/atoms/card";
import {Button} from "@/components/atoms/button";
import {ThemeToggle} from "@/components/molecules/theme-toggle";
import {BindTelegramButton} from "@/components/molecules/buttons/bind-telegram-button";
import {TelegramStatus} from "@/components/molecules/telegram-status";
import {LogOut, User} from "lucide-react";

export default function ProfilePage() {
    const {user, isLoading, logout, login} = useUser();


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
                                <img src={user.user.picture} alt="avatar" className="w-full h-full object-cover"/>
                            ) : (
                                <User className="h-6 w-6 text-muted-foreground"/>
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
                                    <LogOut size={16}/> Logout
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" onClick={() => login()}>
                                    Login
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                {user && (
                    <CardContent className="p-4 pt-0">
                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm">Telegram</div>
                                {user?.tg_id ? <TelegramStatus isConnected/> : <BindTelegramButton/>}
                            </div>
                        </div>
                    </CardContent>
                )}
                <CardFooter className="p-4 pt-3 border-t">
                    <div className="flex items-center justify-between w-full">
                        <div className="text-sm text-muted-foreground">Theme</div>
                        <div className="flex gap-2">
                            <ThemeToggle/>
                        </div>
                    </div>
                </CardFooter>


            </Card>
        </div>
    );
}
