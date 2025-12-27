import React, { useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sgotinishApi } from "../api/sgotinishApi";
import { Message as MessageType, PermissionType, ShortUserResponse, Ticket, SGUserResponse } from "../types";
import { useUser } from "@/hooks/use-user";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Check, CheckCheck, User } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { Textarea } from "@/components/atoms/textarea";
import { Button } from "@/components/atoms/button";
import { mapRoleToDisplayName } from "../utils/roleMapping";

interface MessageProps {
  message: MessageType;
  isCurrentUserMessage: boolean;
  ticketAuthor: ShortUserResponse | null | undefined;
  isTicketAnonymous: boolean;
  participantsMap: Record<string, ShortUserResponse>;
  currentUserSub?: string;
}

const Message: React.FC<MessageProps> = ({ message, isCurrentUserMessage, ticketAuthor, isTicketAnonymous, participantsMap, currentUserSub }) => {
  const { ref, inView } = useInView({
    threshold: 0.5,
    triggerOnce: true,
  });
  const { user } = useUser();
  const queryClient = useQueryClient();
  const hasMarkedAsReadRef = useRef(false);

  const markAsReadMutation = useMutation({
    mutationFn: () => sgotinishApi.markMessageAsRead(message.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", message.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["ticket"] });
    },
  });

  useEffect(() => {
    const hasRead = message.message_read_statuses.some(s => s.user_sub === user?.sub);
    if (inView && !isCurrentUserMessage && !hasRead && !hasMarkedAsReadRef.current && !markAsReadMutation.isPending) {
      hasMarkedAsReadRef.current = true;
      markAsReadMutation.mutate();
    }
  }, [inView, isCurrentUserMessage, message.id, user?.sub]);

  const isReadByOthers = message.message_read_statuses.some((status) => {
    if (currentUserSub && status.user_sub === currentUserSub) return false;
    if (message.sender_sub && status.user_sub === message.sender_sub) return false;
    return true;
  });

  const getSenderInfo = () => {
    if (message.sender) {
      if ("user" in message.sender) {
        const sgSender = message.sender as SGUserResponse;
        const { user: sgUser, department_name, role } = sgSender;
        return (
          <>
            {sgUser.picture ? (
              <img
                src={sgUser.picture}
                alt={`${sgUser.name} ${sgUser.surname}`}
                className="h-4 w-4 rounded-full flex-shrink-0"
              />
            ) : (
              <User className="h-4 w-4 flex-shrink-0 text-gray-500" />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {`${sgUser.name} ${sgUser.surname}`}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {department_name} • {mapRoleToDisplayName(role)}
              </span>
            </div>
          </>
        );
      }

      const shortSender = message.sender as ShortUserResponse;
      return (
        <>
          {shortSender.picture ? (
            <img
              src={shortSender.picture}
              alt={`${shortSender.name} ${shortSender.surname}`}
              className="h-4 w-4 rounded-full flex-shrink-0"
            />
          ) : (
            <User className="h-4 w-4 flex-shrink-0 text-gray-500" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {`${shortSender.name} ${shortSender.surname}`}
          </span>
        </>
      );
    }

    if (message.is_from_sg_member) {
      const senderSub = message.sender_sub ?? "";
      const sgParticipant = participantsMap[senderSub];
      if (sgParticipant) {
        return (
          <>
            {sgParticipant.picture ? (
              <img
                src={sgParticipant.picture}
                alt={`${sgParticipant.name} ${sgParticipant.surname}`}
                className="h-4 w-4 rounded-full flex-shrink-0"
              />
            ) : (
              <User className="h-4 w-4 flex-shrink-0 text-gray-500" />
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{`${sgParticipant.name} ${sgParticipant.surname}`}</span>
          </>
        );
      }
      return (
        <>
          <User className="h-4 w-4 flex-shrink-0 text-gray-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Support Member</span>
        </>
      );
    } else {
      // Message from ticket author - show ticket author info
      if (!isTicketAnonymous && ticketAuthor) {
        return (
          <>
            <img src={ticketAuthor.picture} alt={`${ticketAuthor.name} ${ticketAuthor.surname}`} className="h-4 w-4 rounded-full flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{`${ticketAuthor.name} ${ticketAuthor.surname}`}</span>
          </>
        );
      } else {
        return (
          <>
            <User className="h-4 w-4 flex-shrink-0 text-gray-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Anonymous</span>
          </>
        );
      }
    }
  };
  
  return (
    <div
      ref={ref}
      className={`p-3 rounded-lg ${
        message.is_from_sg_member
          ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400"
          : "bg-gray-50 dark:bg-gray-800/50"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
        <div className="flex items-center gap-2">{getSenderInfo()}</div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {format(new Date(message.sent_at + 'Z'), "MMM d, yyyy, h:mm a", { locale: enUS })}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{message.body}</p>
      {isCurrentUserMessage && (
        <div className="flex justify-end mt-1">
          {isReadByOthers ? (
            <CheckCheck className="h-4 w-4 text-blue-500" />
          ) : (
            <Check className="h-4 w-4 text-gray-400" />
          )}
        </div>
      )}
    </div>
  );
};


interface ConversationProps {
    conversationId: number;
    participants: ShortUserResponse[];
    ticket: Pick<Ticket, "id" | "is_anonymous" | "author" | "author_sub" | "ticket_access"> & {
        permissions?: Ticket["permissions"];
    };
    canSendMessageOverride?: boolean;
}

export const Conversation: React.FC<ConversationProps> = ({ conversationId, participants, ticket, canSendMessageOverride }) => {
    const { user } = useUser();
    const [newMessage, setNewMessage] = React.useState("");
    const queryClient = useQueryClient();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: ["messages", conversationId],
        queryFn: ({ pageParam = 1 }) => sgotinishApi.getMessages(conversationId, { page: pageParam, size: 20 }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage) return undefined;
            const currentPage = typeof lastPage.page === "number" ? lastPage.page : allPages.length;
            if (lastPage.has_next === true) return currentPage + 1;
            if (lastPage.has_next === false) return undefined;
            const totalPages = lastPage.total_pages ?? 0;
            return currentPage < totalPages ? currentPage + 1 : undefined;
        },
    });

    const observer = useRef<IntersectionObserver>();
    const lastMessageRef = useCallback(
        (node: HTMLDivElement) => {
            if (isFetchingNextPage) return;
            if (observer.current) observer.current.disconnect();
            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasNextPage) {
                    fetchNextPage();
                }
            });
            if (node) observer.current.observe(node);
        },
        [isFetchingNextPage, hasNextPage, fetchNextPage]
    );

    const createMessageMutation = useMutation({
        mutationFn: sgotinishApi.createMessage,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
          setNewMessage("");
        },
    });

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        createMessageMutation.mutate({
            conversation_id: conversationId,
            body: newMessage,
        });
    };

    const messages = data?.pages.flatMap((page) => page.items ?? []) ?? [];
    const ticketAuthorSub = ticket.author?.sub ?? ticket.author_sub ?? null;

    const participantsMap = React.useMemo(() => {
        const map: Record<string, ShortUserResponse> = {};
        participants.forEach((participant) => {
            map[participant.sub] = participant;
        });
        if (ticket.author && ticket.author.sub) {
            map[ticket.author.sub] = ticket.author;
        }
        return map;
    }, [participants, ticket.author]);

    const isTicketAuthor = ticketAuthorSub ? user?.sub === ticketAuthorSub : false;
    const userRole = user?.role;
    const isSgMember = userRole ? ["boss", "capo", "soldier"].includes(userRole) : false;
    const hasSgMessagingPermission =
        userRole === "admin" ||
        (isSgMember &&
            (ticket.ticket_access === PermissionType.ASSIGN ||
                ticket.ticket_access === PermissionType.DELEGATE));

    const effectiveOverride = canSendMessageOverride ?? ticket.permissions?.can_edit ?? false;

    const canWriteToConversation = effectiveOverride || isTicketAuthor || hasSgMessagingPermission;

    return (
        <div className="space-y-4">
            {isLoading && <p>Loading messages...</p>}
            {isError && <p>Error loading messages.</p>}
            
            <div className="space-y-4">
                {messages.map((message, index) => {
                    const isLastMessage = index === messages.length - 1;
                    const isCurrentUserMessage = (() => {
                        if (message.sender_sub && user?.sub) {
                            return message.sender_sub === user.sub;
                        }
                        if (!message.sender_sub && !message.is_from_sg_member && ticketAuthorSub && user?.sub) {
                            return ticketAuthorSub === user.sub;
                        }
                        return false;
                    })();
                    return (
                        <div ref={isLastMessage ? lastMessageRef : null} key={message.id}>
                            <Message
                                message={message}
                                isCurrentUserMessage={isCurrentUserMessage}
                                ticketAuthor={ticket.author}
                                isTicketAnonymous={ticket.is_anonymous}
                                participantsMap={participantsMap}
                                currentUserSub={user?.sub}
                            />
                        </div>
                    );
                })}
            </div>

            {isFetchingNextPage && <p>Loading more messages...</p>}

            {!isLoading && messages.length === 0 && (
                <p className="text-center text-gray-500">No messages yet.</p>
            )}

            {canWriteToConversation ? (
                <form onSubmit={handleSendMessage} className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-3">
                        <Textarea
                            placeholder="Type your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={createMessageMutation.isPending || !newMessage.trim()}
                            >
                                {createMessageMutation.isPending ? "Sending..." : "Send Message"}
                            </Button>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        You can only write to conversations you created or to your own tickets.
                    </p>
                </div>
            )}
        </div>
    );
};
