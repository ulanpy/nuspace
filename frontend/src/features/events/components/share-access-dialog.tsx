"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { campuscurrentAPI } from "@/features/events/api/events-api";
import { toast } from "@/hooks/toast";
import type {
  EventAccessInvite,
  EventAccessInviteCreated,
  EventAccessPurpose,
} from "@/features/shared/campus/types";

type ShareAccessDialogProps = {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
};

const PURPOSE_COPY: Record<
  EventAccessPurpose,
  { title: string; description: string; warning?: string }
> = {
  transfer: {
    title: "Transfer ownership",
    description:
      "Create a link to transfer full event management and attendee-list access.",
    warning: "Once the recipient accepts this link, you will permanently lose control over the event.",
  },
  co_view: {
    title: "Share attendee list only",
    description:
      "Anyone who opens this link can view and export Who's going.",
  },
};

export function ShareAccessDialog({ eventId, isOpen, onClose }: ShareAccessDialogProps) {
  const [purpose, setPurpose] = useState<EventAccessPurpose | null>(null);
  const [created, setCreated] = useState<EventAccessInviteCreated | null>(null);
  const [invites, setInvites] = useState<EventAccessInvite[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPurpose(null);
    setCreated(null);
    setCopied(false);
    void campuscurrentAPI
      .listAccessInvites(String(eventId))
      .then((res) => setInvites((res.items ?? []).filter((item) => item.is_active)))
      .catch(() => setInvites([]));
  }, [eventId, isOpen]);

  const fullUrl = created
    ? `${window.location.origin}${created.url_path}`
    : "";

  const handleCreate = async () => {
    if (!purpose) return;
    setIsCreating(true);
    try {
      const result = await campuscurrentAPI.createAccessInvite(
        String(eventId),
        purpose,
      );
      setCreated(result);
      const list = await campuscurrentAPI.listAccessInvites(String(eventId));
      setInvites((list.items ?? []).filter((item) => item.is_active));
    } catch {
      toast({
        title: "Error",
        description: "Failed to create access link",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!fullUrl) return;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast({ title: "Copied", description: "Access link copied to clipboard" });
  };

  const handleRevoke = async (inviteId: number) => {
    try {
      await campuscurrentAPI.revokeAccessInvite(String(eventId), inviteId);
      setInvites((prev) => prev.filter((item) => item.id !== inviteId));
      toast({ title: "Revoked", description: "Access link revoked" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to revoke link",
        variant: "destructive",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share organizer access"
      className="max-w-lg"
    >
      <div className="space-y-5 p-1">
        <p className="text-sm text-muted-foreground">
          Pick the kind of link to generate. You can create several links of either type.
        </p>

        {!created ? (
          <>
            <div className="grid gap-2">
              {(Object.keys(PURPOSE_COPY) as EventAccessPurpose[]).map((key) => {
                const copy = PURPOSE_COPY[key];
                const selected = purpose === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPurpose(key)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border/70 hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-sm font-medium">{copy.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
                    {copy.warning ? (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        {copy.warning}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <Button
              className="w-full gap-2"
              disabled={!purpose || isCreating}
              onClick={() => void handleCreate()}
            >
              <Link2 className="h-4 w-4" />
              {isCreating ? "Generating…" : "Generate link"}
            </Button>
          </>
        ) : (
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-sm font-medium">
              {PURPOSE_COPY[created.purpose].title} link ready
            </p>
            <p className="break-all rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
              {fullUrl}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-1.5" onClick={() => void handleCopy()}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCreated(null);
                  setPurpose(null);
                  setCopied(false);
                }}
              >
                Create another
              </Button>
            </div>
          </div>
        )}

        {invites.length > 0 ? (
          <div className="space-y-2 border-t border-border/50 pt-4">
            <p className="text-sm font-medium">Active links</p>
            <ul className="max-h-40 space-y-2 overflow-y-auto">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {invite.purpose === "transfer" ? "Transfer" : "Co-view"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Revoke link"
                    onClick={() => void handleRevoke(invite.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
