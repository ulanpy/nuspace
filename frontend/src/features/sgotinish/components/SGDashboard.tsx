import { useState } from "react";
import { TicketCard } from "./TicketCard";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Filter, Users, Clock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
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
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        {onBack && (
          <div className="mb-6">
            <Button variant="ghost" onClick={onBack} className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to selection
            </Button>
          </div>
        )}
        
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">SG Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage student appeals and track metrics</p>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{mockStats.totalTickets}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{mockStats.openTickets}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{mockStats.inProgressTickets}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{mockStats.resolvedToday}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
          </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search appeals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-shrink-0 h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Filter className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
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
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* New Appeals */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                New Appeals
                <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">{filteredNewTickets.length}</Badge>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTakeTicket(ticket.id);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-medium shadow-sm transition-colors text-xs sm:text-sm"
                    >
                      Take
                    </Button>
                  </div>
                  {ticket.isAnonymous && (
                    <Badge 
                      variant="secondary" 
                      className="absolute left-3 bottom-3 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      Anonymous
                    </Badge>
                  )}
                </div>
              ))}
                
              {filteredNewTickets.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No new appeals
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Appeals */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                My Appeals  
                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">{filteredMyTickets.length}</Badge>
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
                      className="absolute left-3 bottom-3 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      Anonymous
                    </Badge>
                  )}
                </div>
              ))}
              
              {filteredMyTickets.length === 0 && (
                <div className="text-center py-8">
                  <XCircle className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No appeals in progress
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MotionWrapper>
  );
}