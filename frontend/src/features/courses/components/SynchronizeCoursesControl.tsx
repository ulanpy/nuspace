import { useState, useMemo } from "react";
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button } from "@/components/atoms/button";
import { Modal } from "@/components/atoms/modal";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/atoms/alert";
import { RefreshCcw, Lock, AlertCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { RegistrarSyncResponse } from "../types";

interface SynchronizeCoursesControlProps {
  onSync: (password: string) => Promise<RegistrarSyncResponse>;
  userEmail: string;
}

export function SynchronizeCoursesControl({
  onSync,
  userEmail,
}: SynchronizeCoursesControlProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncResult, setSyncResult] = useState<RegistrarSyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const username = useMemo(() => {
    if (!userEmail) return "";
    const [name] = userEmail.split("@");
    return name || "";
  }, [userEmail]);

  const handleOpen = () => {
    setPassword("");
    setShowPassword(false);
    setSyncResult(null);
    setError(null);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onSync(password.trim());
      setSyncResult(result);
    } catch (err) {
      console.error("Failed to sync courses", err);
      setError("Failed to sync courses. Please double-check your password and try again. If the problem persists, please contact us");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevealPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setShowPassword(true);
  };

  const handleRevealPointerUp = () => {
    setShowPassword(false);
  };

  const handleRevealKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setShowPassword(true);
    }
  };

  const handleRevealKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setShowPassword(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={handleOpen} className="rounded-full px-4 font-medium gap-2">
        <RefreshCcw className="h-4 w-4" />
        Sync
      </Button>
      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title="Sync Nuspace with Registrar"
        className="max-w-lg"
        contentClassName="rounded-3xl"
      >
        <div className="space-y-5">
          <Alert variant="default" className="border-border/60 bg-muted/40">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">We never store your NU Registrar password.</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              Your credentials are sent directly to the registrar via our API just to fetch your courses and schedule.
            </AlertDescription>
          </Alert>

          <form action="/registered_courses/sync" method="POST" onSubmit={(ev) => {ev.preventDefault(); handleSubmit()}}>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Registrar username</label>
                <Input value={username} readOnly className="cursor-not-allowed bg-muted/60" />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Registrar password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your registrar password"
                    className="h-11 rounded-xl pr-10"
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onPointerDown={handleRevealPointerDown}
                    onPointerUp={handleRevealPointerUp}
                    onPointerLeave={handleRevealPointerUp}
                    onPointerCancel={handleRevealPointerUp}
                    onBlur={handleRevealPointerUp}
                    onKeyDown={handleRevealKeyDown}
                    onKeyUp={handleRevealKeyUp}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

          {error && (
            <Alert variant="destructive" className="my-2 border-destructive/50 bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">Synchronization failed</AlertTitle>
              <AlertDescription className="text-xs">
                {error.includes("contact us") ? (
                  <>
                    {error.split("contact us")[0]}
                    <a 
                      href="https://t.me/kamikadze24" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-destructive underline hover:text-destructive/80"
                    >
                      contact us
                    </a>
                  </>
                ) : (
                  error
                )}
              </AlertDescription>
            </Alert>
          )}

          {syncResult && (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/40 p-4 text-xs">
              <h4 className="text-sm font-semibold text-foreground">Synchronization summary</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Total: {syncResult.total_synced}</Badge>
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                  Added: {syncResult.added_count}
                </Badge>
                <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400">
                  Kept: {syncResult.kept_count}
                </Badge>
                <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                  Removed: {syncResult.deleted_count}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Courses will appear in your dashboard immediately.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 my-2">
            <Button
              size="sm"
              // onClick={}
              disabled={isSubmitting || !password.trim()}
              className="gap-2"
            >
              <input type="submit" value={isSubmitting ? "Syncing…" : "Sync"} />
              <RefreshCcw className={`h-4 w-4 ${isSubmitting ? "animate-spin" : ""}`} />
            </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
