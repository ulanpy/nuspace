import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Textarea } from "@/components/atoms/textarea";
import { ArrowLeft, MessageCircle, Clock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

interface TicketDetailProps {
  onBack?: () => void;
}

// Mock data - in real app this would come from API
const mockTicket = {
  id: "1",
  title: "Library access issue",
  category: "Infrastructure",
  status: "in_progress" as const,
  description: "The library Wi-Fi is not working properly in the study areas. Students are unable to access online resources for their research.",
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  isAnonymous: false,
  authorName: "John Doe",
  messages: [
    {
      id: "1",
      content: "Thank you for reporting this issue. We'll investigate and get back to you soon.",
      author: "SG Representative",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isFromSG: true,
    },
    {
      id: "2",
      content: "The issue has been reported to IT services. They're working on a fix.",
      author: "SG Representative",
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      isFromSG: true,
    },
  ],
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "open":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">Pending</Badge>;
    case "in_progress":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">In Progress</Badge>;
    case "resolved":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Resolved</Badge>;
    case "closed":
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300">Closed</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

export default function TicketDetail({ onBack }: TicketDetailProps) {
  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MotionWrapper>
      <div className="min-h-screen bg-background flex flex-col p-3 sm:p-4 pb-[calc(56px+env(safe-area-inset-bottom))]">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Back Button */}
          <div className="mb-4">
            <Button 
              variant="ghost" 
              onClick={onBack || (() => navigate(-1))} 
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to dashboard
            </Button>
          </div>

          {/* Ticket Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg sm:text-xl mb-2">{mockTicket.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="text-primary font-medium">{mockTicket.category}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(mockTicket.createdAt, { addSuffix: true, locale: enUS })}</span>
                    </div>
                    {!mockTicket.isAnonymous && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{mockTicket.authorName}</span>
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge(mockTicket.status)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {mockTicket.description}
              </p>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                Conversation ({mockTicket.messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockTicket.messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.isFromSG
                      ? "bg-primary/5 border-l-4 border-primary"
                      : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-sm font-medium">
                      {message.isFromSG ? "SG Representative" : mockTicket.authorName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(message.createdAt, { addSuffix: true, locale: enUS })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{message.content}</p>
                </div>
              ))}

              {/* New Message Form */}
              <form onSubmit={handleSendMessage} className="pt-4 border-t">
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
                      disabled={isSubmitting || !newMessage.trim()}
                      size="sm"
                    >
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MotionWrapper>
  );
}