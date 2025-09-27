import React, { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Textarea } from "@/components/atoms/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Modal } from "@/components/atoms/modal";
import { MessageCircle, Clock, User, Shield, Settings } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sgotinishApi } from "../api/sgotinishApi";
import { useUser } from "@/hooks/use-user";
import { DelegateModal } from "./DelegateModal";

interface TicketDetailProps {
  onBack?: () => void;
}

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

export default function TicketDetail({}: TicketDetailProps) {
  const navigate = useNavigate();
  const { id: ticketId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [isDelegateModalOpen, setDelegateModalOpen] = useState(false);
  const [isStatusEditOpen, setStatusEditOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("open");

  const [newMessage, setNewMessage] = useState("");

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

  const { data: messagesResponse, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", ticket?.conversations[0]?.id],
    queryFn: () => sgotinishApi.getMessages(ticket!.conversations[0].id),
    enabled: !!ticket && ticket.conversations.length > 0,
  });

  const createMessageMutation = useMutation({
    mutationFn: sgotinishApi.createMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      setNewMessage("");
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: sgotinishApi.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: (status: string) => sgotinishApi.updateTicket(Number(ticketId), { status: status as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["sg-tickets"] });
      setStatusEditOpen(false);
    },
  });

  const handleStatusChange = () => {
    if (selectedStatus !== ticket?.status) {
      updateTicketMutation.mutate(selectedStatus);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, conversationId: number) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    createMessageMutation.mutate({
      conversation_id: conversationId,
      body: newMessage,
    });
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
        <Button onClick={() => navigate(-1)} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  const canDelegate = ticket.ticket_access === 'delegate';
  const isSgMember = user && ["boss", "capo", "soldier"].includes(user.role);
  const canUpdateStatus = isSgMember && (ticket.ticket_access === 'assign' || ticket.ticket_access === 'delegate');

  return (
    <MotionWrapper>
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Ticket Header */}
        <Card className="mb-6 hover:shadow-md transition-shadow relative">
          <CardHeader className="relative pt-12">
            {/* Action buttons - Absolute positioned top right */}
            <div className="absolute top-2 right-2 flex gap-1 z-10">
              {canUpdateStatus && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedStatus(ticket.status);
                    setStatusEditOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs h-8 px-2"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
              {isSgMember && canDelegate && (
                <Button 
                  size="sm" 
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 text-xs h-8 px-2"
                  onClick={() => setDelegateModalOpen(true)}
                >
                  <Shield className="h-4 w-4" />
                  <span className="sm:inline">Access</span>
                </Button>
              )}
            </div>
            
            {/* Title - Full width */}
            <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {ticket.title}
            </CardTitle>
            
            {/* Meta Info */}
            <div className="space-y-3 mt-3">
              
              {/* Compact badges and info row - Mobile optimized */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                {/* Status and Category badges together */}
                <div className="flex items-center gap-1.5">
                  {getStatusBadge(ticket.status)}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 h-5">
                    {ticket.category}
                  </span>
                </div>
                
                {/* Separator dot */}
                <span className="text-gray-400 dark:text-gray-500">•</span>
                
                {/* Time and Author info */}
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="text-xs">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: enUS })}</span>
                </div>
                
                {!ticket.is_anonymous && ticket.author ? (
                  <>
                    <span className="text-gray-400 dark:text-gray-500">•</span>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <img 
                        src={ticket.author.picture} 
                        alt={`${ticket.author.name} ${ticket.author.surname}`}
                        className="h-3 w-3 rounded-full flex-shrink-0"
                      />
                      <span className="text-xs truncate">{`${ticket.author.name} ${ticket.author.surname}`}</span>
                    </div>
                  </>
                ) : ticket.is_anonymous ? (
                  <>
                    <span className="text-gray-400 dark:text-gray-500">•</span>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span className="text-xs">Anonymous</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {ticket.body}
            </p>
          </CardContent>
        </Card>

        {/* Conversations */}
        {ticket.conversations.map(conversation => (
          <Card key={conversation.id} className="mb-6 hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Conversation with {conversation.sg_member?.name} {conversation.sg_member?.surname}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingMessages && <p>Loading messages...</p>}
              {messagesResponse?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.is_from_sg_member
                      ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400"
                      : "bg-gray-50 dark:bg-gray-800/50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {message.is_from_sg_member && conversation.sg_member ? (
                        <>
                          <img 
                            src={conversation.sg_member.picture} 
                            alt={`${conversation.sg_member.name} ${conversation.sg_member.surname}`}
                            className="h-4 w-4 rounded-full flex-shrink-0"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {`${conversation.sg_member.name} ${conversation.sg_member.surname}`}
                          </span>
                        </>
                      ) : !ticket.is_anonymous && ticket.author ? (
                        <>
                          <img 
                            src={ticket.author.picture} 
                            alt={`${ticket.author.name} ${ticket.author.surname}`}
                            className="h-4 w-4 rounded-full flex-shrink-0"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {`${ticket.author.name} ${ticket.author.surname}`}
                          </span>
                        </>
                      ) : (
                        <>
                          <User className="h-4 w-4 flex-shrink-0 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {ticket.is_anonymous ? "Anonymous" : "Unknown User"}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true, locale: enUS })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{message.body}</p>
                </div>
              ))}
              {messagesResponse?.messages.length === 0 && <p className="text-center text-gray-500">No messages yet.</p>}


              {/* New Message Form - Only show if user can write to this conversation */}
              {(() => {
                // Check if current user can write to this conversation
                const isTicketAuthor = !ticket.is_anonymous && ticket.author && user?.sub === ticket.author.sub;
                const isConversationCreator = user?.sub === conversation.sg_member_sub;
                const canWriteToConversation = isTicketAuthor || isConversationCreator;
                
                if (!canWriteToConversation) {
                  return (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        You can only write to conversations you created or to your own tickets.
                      </p>
                    </div>
                  );
                }
                
                return (
                  <form onSubmit={(e) => handleSendMessage(e, conversation.id)} className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={3}
                        className="resize-none border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={createMessageMutation.isPending || !newMessage.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                        >
                          {createMessageMutation.isPending ? "Sending..." : "Send Message"}
                        </Button>
                      </div>
                    </div>
                  </form>
                );
              })()}
            </CardContent>
          </Card>
        ))}

        {isSgMember && ticket.conversations.length === 0 && (ticket.ticket_access === 'assign' || ticket.ticket_access === 'delegate') && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">No conversations started yet.</p>
              <Button
                onClick={() => {
                  createConversationMutation.mutate({
                    ticket_id: ticket.id,
                    sg_member_sub: "me",
                  });
                }}
                disabled={createConversationMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
              >
                {createConversationMutation.isPending ? "Creating..." : "Create Conversation"}
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
              <SelectContent>
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