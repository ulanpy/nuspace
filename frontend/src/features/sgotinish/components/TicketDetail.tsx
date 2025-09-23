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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={onBack || (() => navigate(-1))} 
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Button>
        </div>

        {/* Ticket Header */}
        <Card className="mb-6 hover:shadow-md transition-shadow">
          <CardHeader>
            {/* Title and Meta Info - Compact layout */}
            <div className="space-y-3">
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {mockTicket.title}
              </CardTitle>
              
              {/* Compact badges and info row */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {/* Status and Category badges together */}
                <div className="flex items-center gap-1.5">
                  {getStatusBadge(mockTicket.status)}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 h-5">
                    {mockTicket.category}
                  </span>
                </div>
                
                {/* Separator dot */}
                <span className="text-gray-400 dark:text-gray-500">•</span>
                
                {/* Time and Author info */}
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="text-xs">{formatDistanceToNow(mockTicket.createdAt, { addSuffix: true, locale: enUS })}</span>
                </div>
                
                {!mockTicket.isAnonymous && (
                  <>
                    <span className="text-gray-400 dark:text-gray-500">•</span>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span className="text-xs truncate">{mockTicket.authorName}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {mockTicket.description}
            </p>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="mb-6 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
              <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Conversation ({mockTicket.messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockTicket.messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg ${
                  message.isFromSG
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400"
                    : "bg-gray-50 dark:bg-gray-800/50"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {message.isFromSG ? "SG Representative" : mockTicket.authorName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(message.createdAt, { addSuffix: true, locale: enUS })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{message.content}</p>
              </div>
            ))}

            {/* New Message Form */}
            <form onSubmit={handleSendMessage} className="pt-4 border-t border-gray-200 dark:border-gray-700">
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
                    disabled={isSubmitting || !newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MotionWrapper>
  );
}