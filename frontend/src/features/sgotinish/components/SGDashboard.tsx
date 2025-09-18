import { useState } from "react";
import { TicketCard } from "./TicketCard";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Search, Filter, Users, Clock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { ROUTES } from "@/data/routes";

// Mock data
const mockStats = {
  totalTickets: 45,
  openTickets: 12,
  inProgressTickets: 8,
  resolvedToday: 5,
};

const mockNewTickets = [
  {
    id: "4",
    title: "Library access issue",
    category: "Infrastructure",
    status: "open" as const,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    messageCount: 0,
    isAnonymous: false,
    authorName: "Maria Ivanova",
  },
  {
    id: "5",
    title: "Question about exam week",
    category: "Academic", 
    status: "open" as const,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    messageCount: 0,
    isAnonymous: true,
  },
];

const mockMyTickets = [
  {
    id: "2",
    title: "Wi-Fi not working in dormitory",
    category: "Infrastructure",
    status: "in_progress" as const,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    messageCount: 3,
    isAnonymous: false,
    authorName: "Peter Sidorov",
  },
  {
    id: "6",
    title: "Sports event organization",
    category: "Events",
    status: "in_progress" as const,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    messageCount: 7,
    isAnonymous: false,
    authorName: "Anna Kozlova",
  },
];

interface SGDashboardProps {
  onBack?: () => void;
}

export default function SGDashboard({ onBack }: SGDashboardProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const handleTicketClick = (ticketId: string) => {
    navigate(ROUTES.APPS.SGOTINISH.SG.TICKET.DETAIL_FN(ticketId));
  };

  const handleTakeTicket = (ticketId: string) => {
    // Simulate taking ticket to work
    console.log("Taking ticket:", ticketId);
  };

  const filteredNewTickets = mockNewTickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredMyTickets = mockMyTickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <MotionWrapper>
      <div className="min-h-screen bg-background flex flex-col p-3 sm:p-4 pb-[calc(56px+env(safe-area-inset-bottom))]">
        <div className="container mx-auto px-4 py-6">
          {/* Back Button */}
          {onBack && (
            <div className="mb-4">
              <Button variant="ghost" onClick={onBack} className="p-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to selection
              </Button>
            </div>
          )}
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                    <p className="text-lg sm:text-2xl font-bold text-foreground">{mockStats.totalTickets}</p>
                  </div>
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                    <p className="text-lg sm:text-2xl font-bold text-status-open">{mockStats.openTickets}</p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-status-open opacity-80" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">In Progress</p>
                    <p className="text-lg sm:text-2xl font-bold text-status-progress">{mockStats.inProgressTickets}</p>
                  </div>
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-status-progress opacity-80" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Resolved</p>
                    <p className="text-lg sm:text-2xl font-bold text-status-resolved">{mockStats.resolvedToday}</p>
                  </div>
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-status-resolved opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search appeals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="Academic">Academic</SelectItem>
                <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                <SelectItem value="Events">Events</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* New Tickets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-status-open" />
                  New Appeals
                  <Badge variant="secondary">{filteredNewTickets.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredNewTickets.map((ticket) => (
                  <div key={ticket.id} className="relative">
                    <TicketCard
                      {...ticket}
                      onClick={() => handleTicketClick(ticket.id)}
                      className="pr-16 sm:pr-20"
                    />
                    <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTakeTicket(ticket.id);
                        }}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        Take
                      </Button>
                    </div>
                    {ticket.isAnonymous && (
                      <Badge 
                        variant="secondary" 
                        className="absolute left-3 bottom-3 text-xs"
                      >
                        Anonymous
                      </Badge>
                    )}
                  </div>
                ))}
                
                {filteredNewTickets.length === 0 && (
                  <div className="text-center py-6 sm:py-8">
                    <CheckCircle className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No new appeals
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Tickets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-status-progress" />
                  My Appeals  
                  <Badge variant="secondary">{filteredMyTickets.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredMyTickets.map((ticket) => (
                  <div key={ticket.id} className="relative">
                    <TicketCard
                      {...ticket}
                      onClick={() => handleTicketClick(ticket.id)}
                    />
                    {ticket.isAnonymous && (
                      <Badge 
                        variant="secondary" 
                        className="absolute left-3 bottom-3 text-xs"
                      >
                        Anonymous
                      </Badge>
                    )}
                  </div>
                ))}
                
                {filteredMyTickets.length === 0 && (
                  <div className="text-center py-6 sm:py-8">
                    <XCircle className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No appeals in progress
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MotionWrapper>
  );
}