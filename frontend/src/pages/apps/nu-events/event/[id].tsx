"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, Calendar, Clock, MapPin, Users, CalendarPlus, Share2 } from "lucide-react"
import { Button } from "@/components/atoms/button"
import { Badge } from "@/components/atoms/badge"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/hooks/use-user"
import { mockApi } from "@/data/mock-events-data"
import { LoginModal } from "@/components/molecules/login-modal"

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
  rating?: number
}

interface Media {
  id: number
  url: string
}

// Helper function to format date for display
const formatEventDate = (dateString: string) => {
  const date = new Date(dateString)
  return format(date, "d MMMM, HH:mm")
}

// Helper function to get policy display text
const getPolicyDisplay = (policy: string) => {
  switch (policy) {
    case "open":
      return "Open Entry"
    case "free_ticket":
      return "Free Ticket"
    case "paid_ticket":
      return "Paid Ticket"
    default:
      return policy
  }
}

// Helper function to get policy badge color
const getPolicyColor = (policy: string) => {
  switch (policy) {
    case "open":
      return "bg-green-500"
    case "free_ticket":
      return "bg-blue-500"
    case "paid_ticket":
      return "bg-amber-500"
    default:
      return "bg-gray-500"
  }
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useUser()

  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return

      try {
        setIsLoading(true)
        setError(null)

        // Using mock API instead of real API call
        const foundEvent = mockApi.getEvent(Number(id))

        if (!foundEvent) {
          throw new Error("Event not found")
        }

        setEvent(foundEvent)
      } catch (err) {
        console.error("Failed to fetch event:", err)
        setError("Failed to fetch event details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [id])

  // Add to Google Calendar
  const addToGoogleCalendar = () => {
    if (!event) return

    if (!user) {
      setPendingAction(() => () => addToGoogleCalendar())
      setShowLoginModal(true)
      return
    }

    const eventDate = new Date(event.event_datetime)
    const endDate = new Date(eventDate.getTime() + event.duration * 60000)

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${eventDate
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

  // Share event
  const shareEvent = () => {
    if (!event) return

    if (navigator.share) {
      navigator.share({
        title: event.name,
        text: `Check out this event: ${event.name}`,
        url: window.location.href,
      })
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link copied",
        description: "Event link copied to clipboard",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4 flex items-center gap-1" onClick={() => navigate("/apps/nu-events")}>
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Events</span>
        </Button>

        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-destructive mb-4">{error || "Event not found"}</h2>
          <Button onClick={() => navigate("/apps/nu-events")}>Return to Events</Button>
        </div>
      </div>
    )
  }

  const eventDate = new Date(event.event_datetime)
  const isPast = eventDate < new Date()

  return (
    <div className="pb-20">
      <Button variant="ghost" className="mb-4 flex items-center gap-1" onClick={() => navigate("/apps/nu-events")}>
        <ChevronLeft className="h-4 w-4" />
        <span>Back to Events</span>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Image */}
        <div className="relative">
          <div className="aspect-video md:aspect-square rounded-lg overflow-hidden">
            {event.media && event.media.length > 0 ? (
              <img
                src={event.media[0].url || "/placeholder.svg"}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Calendar className="h-16 w-16 text-muted-foreground opacity-50" />
              </div>
            )}
          </div>
          <div className="absolute top-4 left-4">
            <Badge className={`${getPolicyColor(event.policy)} text-white`}>{getPolicyDisplay(event.policy)}</Badge>
          </div>
          {event.rating && (
            <div className="absolute top-4 right-4 bg-black/70 text-white text-sm font-bold px-3 py-1 rounded">
              {event.rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{event.name}</h1>
              {event.club && (
                <div
                  className="text-primary hover:underline cursor-pointer mt-1"
                  onClick={() => navigate(`/apps/nu-events/club/${event.club?.id}`)}
                >
                  {event.club.name}
                </div>
              )}
            </div>
            {isPast && (
              <Badge variant="outline" className="text-destructive border-destructive">
                Event Ended
              </Badge>
            )}
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatEventDate(event.event_datetime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{event.duration} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{event.place}</span>
            </div>
            {event.club && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Organized by {event.club.name}</span>
              </div>
            )}
          </div>

          <div className="h-px w-full bg-border my-4" />

          <div>
            <h2 className="font-medium mb-2">About this event</h2>
            <p className="text-muted-foreground whitespace-pre-line">{event.description}</p>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {!isPast && (
              <Button className="flex items-center gap-1" onClick={addToGoogleCalendar}>
                <CalendarPlus className="h-4 w-4" />
                <span>Add to Calendar</span>
              </Button>
            )}
            <Button variant="outline" className="flex items-center gap-1" onClick={shareEvent}>
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </div>
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
