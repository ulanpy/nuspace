import React, { useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sgotinishApi } from "../api/sgotinishApi";
import { Message as MessageType, ShortUserResponse, Ticket } from "../types";
import { useUser } from "@/hooks/use-user";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Check, CheckCheck, User } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { Textarea } from "@/components/atoms/textarea";
import { Button } from "@/components/atoms/button";

interface MessageProps {
  message: MessageType;
  conversationPartner: ShortUserResponse | null | undefined;
  isCurrentUserMessage: boolean;
  ticketAuthor: ShortUserResponse | null | undefined;
  isTicketAnonymous: boolean;
  sgMember: ShortUserResponse | null | undefined;
}

const Message: React.FC<MessageProps> = ({ message, conversationPartner, isCurrentUserMessage, ticketAuthor, isTicketAnonymous, sgMember }) => {
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

  const isReadByPartner = conversationPartner && message.message_read_statuses.some(
    (status) => status.user_sub === conversationPartner.sub
  );

  const getSenderInfo = () => {
    if (message.is_from_sg_member) {
      // Message from SG member - show SG member info
      return sgMember ? (
        <>
          <img src={sgMember.picture} alt={`${sgMember.name} ${sgMember.surname}`} className="h-4 w-4 rounded-full flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{`${sgMember.name} ${sgMember.surname}`}</span>
        </>
      ) : null;
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
          {isReadByPartner ? (
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
    sgMember: ShortUserResponse | null | undefined;
    ticket: Pick<Ticket, "id" | "is_anonymous" | "author" | "author_sub"> & {
        permissions?: Ticket["permissions"];
    };
    canSendMessageOverride?: boolean;
}

export const Conversation: React.FC<ConversationProps> = ({ conversationId, sgMember, ticket, canSendMessageOverride }) => {
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
            return lastPage.messages.length > 0 && allPages.length < lastPage.total_pages
                ? allPages.length + 1
                : undefined;
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
            sender_sub: "me",
            body: newMessage,
        });
    };

    const messages = data?.pages.flatMap((page) => page.messages) ?? [];
    const ticketAuthorSub = ticket.author?.sub ?? ticket.author_sub ?? null;
    // The conversation partner is the other person in the conversation
    // If current user is ticket author, partner is SG member
    // If current user is SG member, partner is ticket author
    const conversationPartner = user?.sub === ticketAuthorSub ? sgMember : ticket.author;

    const isTicketAuthor = ticketAuthorSub ? user?.sub === ticketAuthorSub : false;
    const isConversationCreator = user?.sub === sgMember?.sub;

    const effectiveOverride = canSendMessageOverride ?? ticket.permissions?.can_edit ?? false;

    const canWriteToConversation =
        effectiveOverride ||
        isTicketAuthor ||
        isConversationCreator;

    return (
        <div className="space-y-4">
            {isLoading && <p>Loading messages...</p>}
            {isError && <p>Error loading messages.</p>}
            
            <div className="space-y-4">
                {messages.map((message, index) => {
                    const isLastMessage = index === messages.length - 1;
                    return (
                        <div ref={isLastMessage ? lastMessageRef : null} key={message.id}>
                            <Message
                                message={message}
                                conversationPartner={conversationPartner}
                                isCurrentUserMessage={
                                    (message.is_from_sg_member && user?.sub === sgMember?.sub) ||
                                    (!message.is_from_sg_member && ticketAuthorSub !== null && user?.sub === ticketAuthorSub)
                                }
                                ticketAuthor={ticket.author}
                                isTicketAnonymous={ticket.is_anonymous}
                                sgMember={sgMember}
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
