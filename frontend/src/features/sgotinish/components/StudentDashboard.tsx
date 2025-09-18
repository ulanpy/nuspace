import { useState } from "react";
import { TicketCard } from "./TicketCard";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Plus, Search, Filter, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { ROUTES } from "@/data/routes";
// Mock data
const mockTickets = [
  {
    id: "1",
    title: "Class schedule issue",
    category: "Academic",
    status: "open" as const,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    messageCount: 0,
  },
  {
    id: "2", 
    title: "Wi-Fi not working in dormitory",
    category: "Infrastructure",
    status: "in_progress" as const,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    messageCount: 3,
  },
  {
    id: "3",
    title: "Event organization question",
    category: "Events", 
    status: "resolved" as const,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    messageCount: 5,
  },
];

interface StudentDashboardProps {
  onBack?: () => void;
}

export default function StudentDashboard({ onBack }: StudentDashboardProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredTickets = mockTickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCreateTicket = () => {
    navigate(ROUTES.APPS.SGOTINISH.STUDENT.CREATE);
  };

  const handleTicketClick = (ticketId: string) => {
    navigate(ROUTES.APPS.SGOTINISH.STUDENT.TICKET.DETAIL_FN(ticketId));
  };

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
          
          {/* Action Bar */}
          <div className="flex flex-col gap-4 mb-6">
            <Button 
              onClick={handleCreateTicket}
              variant="default"
              size="lg"
              className="w-full sm:w-auto font-medium"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create new appeal
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search appeals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2 flex-col sm:flex-row">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="open">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
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
          </div>

          {/* Tickets Grid */}
          {filteredTickets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  {...ticket}
                  onClick={() => handleTicketClick(ticket.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto max-w-sm">
                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No appeals found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try changing search parameters or create a new appeal
                </p>
                <Button onClick={handleCreateTicket} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create appeal
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MotionWrapper>
  );
}