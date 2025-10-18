import React, { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Modal } from "@/components/atoms/modal";
import { MessageCircle, Clock, User, Shield, Settings, ShieldCheck, Info, MessageSquare } from "lucide-react";
import { useParams } from "react-router-dom";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { toLocalDate } from "../utils/date";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sgotinishApi } from "../api/sgotinishApi";
import { useUser } from "@/hooks/use-user";
import { DelegateModal } from "./DelegateModal";
import { Conversation } from "./Conversation";

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

export default function TicketDetail() {
  const { id: ticketId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [isDelegateModalOpen, setDelegateModalOpen] = useState(false);
  const [isStatusEditOpen, setStatusEditOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("open");

  console.log("TicketDetail mounted with ticketId:", ticketId, "user:", user);

  const { data: ticket, isLoading, isError, error } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      console.log("Fetching ticket with ID:", ticketId);
      try {
        const result = await sgotinishApi.getTicketById(Number(ticketId));
        console.log("Ticket fetch successful:", result);
        return result;
      } catch (err) {
        console.error("Ticket fetch failed:", err);
        throw err;
      }
    },
    enabled: !!ticketId,
  });

  console.log("TicketDetail - ticketId:", ticketId, "isLoading:", isLoading, "isError:", isError, "error:", error, "ticket:", ticket);

  // Update selectedStatus when ticket data changes - MUST be before any early returns
  React.useEffect(() => {
    if (ticket?.status) {
      setSelectedStatus(ticket.status);
    }
  }, [ticket?.status]);

  const createConversationMutation = useMutation({
    mutationFn: sgotinishApi.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ticket", ticketId]
      });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: (status: string) => sgotinishApi.updateTicket(Number(ticketId), {
      status: status as any
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ticket", ticketId]
      });
      queryClient.invalidateQueries({
        queryKey: ["sg-tickets"]
      });
      setStatusEditOpen(false);
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
        <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="leading-snug">
            {getStatusDefinition(ticket.status)}
          </p>
        </div>

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