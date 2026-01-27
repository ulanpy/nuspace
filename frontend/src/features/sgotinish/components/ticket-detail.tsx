"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Modal } from "@/components/atoms/modal";
import { MessageCircle, Clock, User, Shield, Settings, ShieldCheck, Info, MessageSquare, Lock, Link } from "lucide-react";
import { useSearchParams } from "next/navigation";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { toLocalDate } from "../utils/date";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sgotinishApi } from '../api/sgotinish-api';
import { useUser } from "@/hooks/use-user";
import { DelegateModal } from './delegate-modal';
import { Conversation } from './conversation';
import { hashTicketKey } from "../utils/ticket-keys";
import { useToast } from "@/hooks/use-toast";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "open":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 text-xs px-2 py-0.5 h-5">Pending</Badge>;
    case "in_progress":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 text-xs px-2 py-0.5 h-5">Progress</Badge>;
    case "resolved":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 text-xs px-2 py-0.5 h-5">Resolved</Badge>;
    case "closed":
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 text-xs px-2 py-0.5 h-5">Closed</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5">Unknown</Badge>;
  }
};

const getStatusDefinition = (status: string) => {
  switch (status) {
    case "open":
      return "SG members will soon start working on your appeal";
    case "in_progress":
      return "SG members are working on your appeal. You can expect updates through the conversation.";
    case "resolved":
      return "Your appeal has been resolved. You can still continue the conversation if needed.";
    case "closed":
      return "This appeal has been closed. No further action is expected.";
    default:
      return "Status information is not available.";
  }
};

interface TicketDetailProps {
  ticketKey?: string;
}

export default function TicketDetail({ ticketKey }: TicketDetailProps) {
  const searchParams = useSearchParams();
  // Get ID from query parameter for static export compatibility
  // URL format: /sgotinish/sg/ticket/?id=123 or /sgotinish/student/ticket/?id=123
  const ticketId = searchParams.get('id') || undefined;
  const ticketKeyFromQuery = searchParams.get("key") || searchParams.get("ticket_key") || undefined;
  const effectiveTicketKey = ticketKey ?? ticketKeyFromQuery;
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { toast } = useToast();
  const [isDelegateModalOpen, setDelegateModalOpen] = useState(false);
  const [isStatusEditOpen, setStatusEditOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("open");
  const [ownerHash, setOwnerHash] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!effectiveTicketKey) {
      setOwnerHash(null);
      return () => {
        isMounted = false;
      };
    }
    hashTicketKey(effectiveTicketKey)
      .then((hash) => {
        if (isMounted) setOwnerHash(hash);
      })
      .catch(() => {
        if (isMounted) setOwnerHash(null);
      });
    return () => {
      isMounted = false;
    };
  }, [effectiveTicketKey]);

  const queryKey = useMemo(
    () => ["ticket", ownerHash ?? ticketId ?? "unknown"],
    [ownerHash, ticketId],
  );
  const { data: ticket, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (ownerHash) {
        return sgotinishApi.getTicketByOwnerHash(ownerHash);
      }
      if (!ticketId) {
        throw new Error("Ticket id is missing");
      }
      return sgotinishApi.getTicketById(Number(ticketId));
    },
    enabled: !!ticketId || !!ownerHash,
  });

  console.log("TicketDetail - ticketId:", ticketId, "isLoading:", isLoading, "isError:", isError, "error:", error, "ticket:", ticket);

  // Update selectedStatus when ticket data changes - MUST be before any early returns
  React.useEffect(() => {
    if (ticket?.status) {
      setSelectedStatus(ticket.status);
    }
  }, [ticket?.status]);

  const ticketLink = useMemo(() => {
    if (!effectiveTicketKey || typeof window === "undefined") return null;
    return `${window.location.origin}/t?key=${encodeURIComponent(effectiveTicketKey)}`;
  }, [effectiveTicketKey]);

  const maskedTicketKey = useMemo(() => {
    if (!effectiveTicketKey) return null;
    const lastTwo = effectiveTicketKey.slice(-2);
    return `****${lastTwo}`;
  }, [effectiveTicketKey]);

  const handleCopyLink = async () => {
    if (!ticketLink) return;
    try {
      await navigator.clipboard.writeText(ticketLink);
      toast({
        title: "Link copied",
        description: "Keep it safe. Anyone with the link can access this ticket.",
        variant: "success",
        duration: 6000,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "error",
        duration: 6000,
      });
    }
  };


  const createConversationMutation = useMutation({
    mutationFn: sgotinishApi.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey,
      });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: (status: string) =>
      sgotinishApi.updateTicket(Number(ticket?.id ?? ticketId), {
        status: status as any,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: ["sg-tickets"]
      });
      queryClient.invalidateQueries({
        queryKey: ["student-tickets"]
      });
      setStatusEditOpen(false);
      toast({
        title: "Status updated",
        description: "The ticket status has been successfully updated.",
        variant: "success",
      });
    },
  });

  const handleStatusChange = () => {
    if (selectedStatus !== ticket?.status) {
      updateTicketMutation.mutate(selectedStatus);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError || !ticket) {
    console.error("TicketDetail error:", error);
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-red-600 mb-2">Error loading ticket</h3>
        <p className="text-sm text-gray-500 mb-4">
          {error?.message || "Failed to load ticket details"}
        </p>
        <Button onClick={() => window.history.back()} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  const canDelegate = ticket.ticket_access === "delegate";
  const isSgMember = user && ["boss", "capo", "soldier"].includes(user.role);
  const canUpdateStatus =
    isSgMember &&
    (ticket.ticket_access === "assign" || ticket.ticket_access === "delegate");
  const conversationParticipants = ticket.conversation?.participants ?? [];
  const participantNames = conversationParticipants
    .map((participant) => `${participant.name} ${participant.surname}`)
    .join(", ");

  return (
    <MotionWrapper>
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Status Definition Tip */}
        {!isSgMember && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="leading-snug">
              {getStatusDefinition(ticket.status)}
            </p>
          </div>
        )}

        {!isSgMember && ticket.is_anonymous && (
          <div className="mb-6 rounded-md border border-emerald-100 bg-emerald-50/70 p-4 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
              <div className="space-y-2">
                <p className="leading-snug">
                  This ticket keeps your identity hidden. Access is only via the private link,
                  and we store only a hash of the key. Without the link, access cannot be recovered.
                </p>
                {ticketLink && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="rounded-md border bg-white/70 px-2 py-1 text-[11px] text-emerald-700 dark:bg-slate-900/50 dark:text-emerald-200">
                      {maskedTicketKey}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleCopyLink}>
                        <Link className="mr-2 h-3 w-3" />
                        Copy link
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ticket Header */}
        <Card className="mb-6 hover:shadow-md transition-shadow">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                    {ticket.title}
                  </CardTitle>
                  <div className="flex-shrink-0">{getStatusBadge(ticket.status)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                    {ticket.category}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span>{formatDistanceToNow(toLocalDate(ticket.created_at), { addSuffix: true, locale: enUS })}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {!ticket.is_anonymous && ticket.author ? (
                <div className="flex items-center gap-2">
                  <img 
                    src={ticket.author.picture} 
                    alt={`${ticket.author.name} ${ticket.author.surname}`}
                    className="h-6 w-6 rounded-full flex-shrink-0"
                  />
                  <span className="truncate">{`${ticket.author.name} ${ticket.author.surname}`}</span>
                </div>
              ) : ticket.is_anonymous ? (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span>Anonymous</span>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {ticket.body}
            </p>
          </CardContent>
          {(canUpdateStatus || (isSgMember && canDelegate)) && (
            <CardFooter className="flex flex-row gap-2 border-t border-muted pt-4 items-center justify-end">
              {canUpdateStatus && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedStatus(ticket.status);
                    setStatusEditOpen(true);
                  }}
                  className="flex items-center gap-2 h-8"
                >
                  <Settings className="h-4 w-4" />
                  Edit Status
                </Button>
              )}
              {isSgMember && canDelegate && (
                <Button 
                  size="sm" 
                  className="flex items-center gap-2 h-8 bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => setDelegateModalOpen(true)}
                >
                  <Shield className="h-4 w-4" />
                  Assign Access
                </Button>
              )}
            </CardFooter>
          )}
        </Card>

        {/* Conversation */}
        {ticket.conversation ? (
          <Card className="mb-6 hover:shadow-md transition-shadow">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Conversation
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                  <span className="leading-snug">
                    Only assigned SG members can see these messages. {ticket.is_anonymous ? "Your identity stays hidden unless you share it." : "Share sensitive concerns without posting publicly."}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                  {participantNames || "Anonymous Student"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Conversation
                conversationId={ticket.conversation.id}
                participants={conversationParticipants}
                ownerHash={ownerHash ?? undefined}
                canSendMessageOverride={Boolean(ownerHash)}
                ticket={{
                  id: ticket.id,
                  is_anonymous: ticket.is_anonymous,
                  author: ticket.author,
                  author_sub: ticket.author_sub,
                  permissions: ticket.permissions,
                  ticket_access: ticket.ticket_access,
                }}
              />
            </CardContent>
          </Card>
        ) : null}

        {/* Legacy: support old conversation list if still returned by backend */}
        {!ticket.conversation && ticket.conversations?.length ? (
          ticket.conversations.map((legacyConversation) => (
            <Card key={legacyConversation.id} className="mb-6 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                  <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Private conversation with SG support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Conversation
                  conversationId={legacyConversation.id}
                  participants={legacyConversation.sg_member ? [legacyConversation.sg_member] : []}
                  ownerHash={ownerHash ?? undefined}
                  canSendMessageOverride={Boolean(ownerHash)}
                  ticket={{
                    id: ticket.id,
                    is_anonymous: ticket.is_anonymous,
                    author: ticket.author,
                    author_sub: ticket.author_sub,
                    permissions: ticket.permissions,
                    ticket_access: ticket.ticket_access,
                  }}
                />
              </CardContent>
            </Card>
          ))
        ) : null}

        {isSgMember && !ticket.conversation && !ticket.conversations?.length &&
          (ticket.ticket_access === "assign" || ticket.ticket_access === "delegate") && (
            <Card className="mb-6">
              <CardContent className="p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No conversation started yet for this ticket.
                </p>
                <Button
                  onClick={() => {
                    createConversationMutation.mutate({
                      ticket_id: ticket.id,
                    });
                  }}
                  disabled={createConversationMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                >
                  {createConversationMutation.isPending
                    ? "Creating..."
                    : "Chat in Conversation"}
                </Button>
              </CardContent>
            </Card>
          )}
      </div>
      <DelegateModal
        isOpen={isDelegateModalOpen}
        onClose={() => setDelegateModalOpen(false)}
        ticketId={Number(ticketId)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })}
      />
      
      {/* Status Edit Modal */}
      <Modal
        isOpen={isStatusEditOpen}
        onClose={() => setStatusEditOpen(false)}
        title="Change Ticket Status"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select new status
            </label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setStatusEditOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleStatusChange} 
            disabled={updateTicketMutation.isPending || selectedStatus === ticket?.status}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {updateTicketMutation.isPending ? "Updating..." : "Update Status"}
          </Button>
        </div>
      </Modal>
    </MotionWrapper>
  );
}