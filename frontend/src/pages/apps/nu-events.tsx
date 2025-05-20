"use client"

import { useState, useEffect } from "react"
import { Calendar, Home, Users, CalendarDays, Filter } from "lucide-react"
import { Button } from "../../components/atoms/button"
import { Card } from "../../components/atoms/card"
import { Badge } from "../../components/atoms/badge"
import { useNavigate } from "react-router-dom"
import { useToast } from "../../hooks/use-toast"
import { useUser } from "../../hooks/use-user"
import {
  mockApi,
  todayEvents,
  academicEvents,
  culturalEvents,
  sportsEvents,
  socialEvents,
  featuredEvents,
} from "../../data/mock-events-data"
import { EventCarousel } from "../../components/molecules/event-carousel"
import { LoginModal } from "../../components/molecules/login-modal"
import { NavTabs } from "../../components/molecules/nav-tabs"
import { SearchInput } from "../../components/molecules/search-input"
import { useSearchLogic } from "../../hooks/useSearchLogic"
import { CategorySlider } from "../../components/organisms/category-slider"

// Types for the API responses
interface Club {
  id: number
  name: string
  type: "academic" | "professional" | "recreational" | "cultural" | "sports" | "social" | "art" | "technology"
  description: string
  president: string
  telegram_url: string
  instagram_url: string
  created_at: string
  updated_at: string
  media: Media[]
  members: number
  followers: number
  isFollowing: boolean
}

interface Event {
  id: number
  club_id: number
  name: string
  place: string
  description: string
  duration: number
  event_datetime: string
  policy: "open" | "free_ticket" | "paid_ticket"
  created_at: string
  updated_at: string
  media: Media[]
  club?: Club
  rating?: number // Mock rating for UI
}

interface Media {
  id: number
  url: string
}

// Helper function to get club type display text
const getClubTypeDisplay = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

// Main component
export default function NUEventsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useUser()

  // Navigation tabs
  const navTabs = [
    { label: "Home", path: "/apps/nu-events", icon: <Home className="h-4 w-4" /> },
    { label: "Events", path: "/apps/nu-events/events", icon: <CalendarDays className="h-4 w-4" /> },
    { label: "Clubs", path: "/apps/nu-events/clubs", icon: <Users className="h-4 w-4" /> },
  ]

  // State
  const [events, setEvents] = useState<Event[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  // Search logic using the custom hook
  const {
    inputValue,
    setInputValue,
    handleSearch,
    preSearchedProducts
  } = useSearchLogic({
    baseRoute: "/apps/nu-events",
    searchParam: "search",
    setSelectedCategory
  })

  // Event categories for the slider
  const eventCategories = [
    { title: "All", icon: <Calendar className="h-5 w-5" /> },
    { title: "Academic", icon: <Calendar className="h-5 w-5" /> },
    { title: "Professional", icon: <Calendar className="h-5 w-5" /> },
    { title: "Cultural", icon: <Calendar className="h-5 w-5" /> },
    { title: "Sports", icon: <Calendar className="h-5 w-5" /> },
    { title: "Social", icon: <Calendar className="h-5 w-5" /> },
    { title: "Art", icon: <Calendar className="h-5 w-5" /> },
    { title: "Technology", icon: <Calendar className="h-5 w-5" /> },
  ]

  // Fetch events
  const fetchEvents = async (page = 1, category = selectedCategory, policy = selectedPolicy) => {
    setIsLoading(true)
    try {
      // Using mock API instead of real API call
      const data = mockApi.getEvents(page, 20, category || null, policy)
      setEvents(data.events)
      setTotalPages(data.num_of_pages)
      setCurrentPage(page)
    } catch (error) {
      console.error("Error fetching events:", error)
      toast({
        title: "Error",
        description: "Failed to load events. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch clubs
  const fetchClubs = async () => {
    try {
      // Using mock API instead of real API call
      const data = mockApi.getClubs()
      setClubs(data.clubs)
    } catch (error) {
      console.error("Error fetching clubs:", error)
    }
  }

  // Handle filter changes
  const applyFilters = () => {
    fetchEvents(1, selectedCategory, selectedPolicy)
    setShowFilters(false)
  }

  // Reset filters
  const resetFilters = () => {
    setSelectedCategory("")
    setSelectedPolicy(null)
    fetchEvents(1, null, null)
    setShowFilters(false)
  }

  // Navigate to event details
  const navigateToEventDetails = (eventId: number) => {
    navigate(`/apps/nu-events/event/${eventId}`)
  }

  // Add to Google Calendar
  const addToGoogleCalendar = (event: Event) => {
    if (!user) {
      setPendingAction(() => () => addToGoogleCalendar(event))
      setShowLoginModal(true)
      return
    }

    const eventDate = new Date(event.event_datetime)
    const endDate = new Date(eventDate.getTime() + event.duration * 60000)

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.name,
    )}&dates=${eventDate
      .toISOString()
      .replace(/-|:|\.\d+/g, "")
      .slice(0, -1)}/${endDate
      .toISOString()
      .replace(/-|:|\.\d+/g, "")
      .slice(0, -1)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.place)}`

    window.open(googleCalendarUrl, "_blank")

    toast({
      title: "Success",
      description: "Event added to your Google Calendar",
    })
  }

  // Handle login success
  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchEvents()
    fetchClubs()
  }, [])

  // Effect for category or policy changes
  useEffect(() => {
    if (currentPage === 1) {
      fetchEvents(1, selectedCategory, selectedPolicy)
    } else {
      setCurrentPage(1)
    }
  }, [selectedCategory, selectedPolicy])

  return (
    <div className="space-y-4 pb-20">
      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-3 sm:-mx-4">
        <NavTabs tabs={navTabs} />
      </div>

      <div className="flex flex-col space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold">NU Events</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Discover events at Nazarbayev University</p>
      </div>

      {/* Search and filter */}
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <SearchInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            preSearchedProducts={preSearchedProducts}
            handleSearch={handleSearch}
            setSelectedCondition={setSelectedPolicy as (condition: string) => void}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 w-8 p-0 ${showFilters ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-3 w-3" />
        </Button>
      </div>

      {/* Category slider */}
      <div className="mt-4">
        <CategorySlider
          categories={eventCategories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          setInputValue={setInputValue}
          setSelectedCondition={setSelectedPolicy as (condition: string) => void}
        />
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card className="p-3">
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-medium mb-1.5">Event Policy</h3>
              <div className="flex flex-wrap gap-1.5">
                {["open", "free_ticket", "paid_ticket"].map((policy) => (
                  <Badge
                    key={policy}
                    variant={selectedPolicy === policy ? "default" : "outline"}
                    className="cursor-pointer text-[10px] px-2 py-0 h-5"
                    onClick={() => setSelectedPolicy(selectedPolicy === policy ? null : policy)}
                  >
                    {policy === "open" ? "Open Entry" : policy === "free_ticket" ? "Free Ticket" : "Paid Ticket"}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={resetFilters}>
                Reset
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={applyFilters}>
                Apply
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Featured Events Carousel */}
      <div className="mt-4">
        <EventCarousel title="Featured Events" events={featuredEvents} viewAllLink="/apps/nu-events/featured" />
      </div>

      {/* Today's Events */}
      <div className="mt-4">
        <EventCarousel title="Today's Events" events={todayEvents} viewAllLink="/apps/nu-events/today" />
      </div>

      {/* Academic Events */}
      <div className="mt-4">
        <EventCarousel title="Academic & Professional" events={academicEvents} viewAllLink="/apps/nu-events/academic" />
      </div>

      {/* Cultural Events */}
      <div className="mt-4">
        <EventCarousel title="Cultural & Art" events={culturalEvents} viewAllLink="/apps/nu-events/cultural" />
      </div>

      {/* Sports Events */}
      <div className="mt-4">
        <EventCarousel title="Sports" events={sportsEvents} viewAllLink="/apps/nu-events/sports" />
      </div>

      {/* Social & Recreational Events */}
      <div className="mt-4">
        <EventCarousel title="Social & Recreational" events={socialEvents} viewAllLink="/apps/nu-events/social" />
      </div>

      {/* Popular clubs section */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-bold">Popular Clubs</h2>
          <Button variant="link" className="text-xs p-0 h-auto" onClick={() => navigate("/apps/nu-events/clubs")}>
            See All
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {clubs.slice(0, 4).map((club) => (
            <Card
              key={club.id}
              className="overflow-hidden cursor-pointer"
              onClick={() => navigate(`/apps/nu-events/club/${club.id}`)}
            >
              <div className="aspect-square relative">
                {club.media && club.media.length > 0 ? (
                  <img
                    src={club.media[0].url || "/placeholder.svg"}
                    alt={club.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
                  </div>
                )}
                <Badge className="absolute top-1 left-1 z-10 bg-primary text-primary-foreground text-[10px] px-1 py-0">
                  {getClubTypeDisplay(club.type)}
                </Badge>
              </div>
              <div className="p-2">
                <h3 className="font-medium text-xs line-clamp-1">{club.name}</h3>
                <div className="text-[10px] text-muted-foreground mt-0.5">{club.members} members</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        title="Login Required"
        message="You need to be logged in to add events to your Google Calendar."
      />
    </div>
  )
}