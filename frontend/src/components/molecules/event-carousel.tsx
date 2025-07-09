"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Button } from "../../components/atoms/button"
import { Card, CardContent } from "../../components/atoms/card"
import { Badge } from "../../components/atoms/badge"
import { useNavigate } from "react-router-dom"

interface Event {
  id: number
  name: string
  place: string
  description: string
  event_datetime: string
  policy: string
  media: { id: number; url: string }[]
  club?: {
    id: number
    name: string
    type: string
  }
  rating?: number
}

interface EventCarouselProps {
  title: string
  events: Event[]
  viewAllLink?: string
}

// Helper function to get policy display text
const getPolicyDisplay = (policy: string) => {
  switch (policy) {
    case "open":
      return "Open Entry"
    case "free_ticket":
      return "Free Ticket"
    case "paid_ticket":
      return "Free Ticket"
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

export const EventCarousel = ({ title, events, viewAllLink }: EventCarouselProps) => {
  const navigate = useNavigate()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: "smooth" })
    }
  }

  if (events.length === 0) {
    return null
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-bold">{title}</h2>
        {viewAllLink && (
          <Button variant="link" className="text-xs p-0 h-auto" onClick={() => navigate(viewAllLink)}>
            See All
          </Button>
        )}
      </div>

      <div className="relative group">
        <div ref={scrollContainerRef} className="flex overflow-x-auto gap-2 pb-2 no-scrollbar snap-x">
          {events.map((event) => (
            <Card
              key={event.id}
              className="min-w-[160px] max-w-[160px] sm:min-w-[180px] sm:max-w-[180px] flex-shrink-0 overflow-hidden cursor-pointer snap-start"
              onClick={() => navigate(`/apps/nu-events/event/${event.id}`)}
            >
              <div className="aspect-[1/1.414] relative">
                {event.media && event.media.length > 0 ? (
                  <img
                    src={event.media[0].url || "/placeholder.svg"}
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
                  </div>
                )}
                <div className="absolute top-1 left-1 z-10">
                  <Badge className={`${getPolicyColor(event.policy)} text-white text-[10px] px-1 py-0`}>
                    {getPolicyDisplay(event.policy)}
                  </Badge>
                </div>
                {event.rating && (
                  <div className="absolute top-1 right-1 z-10 bg-black/70 text-white text-[10px] font-bold px-1 py-0.5 rounded">
                    {event.rating.toFixed(1)}
                  </div>
                )}
              </div>
              <CardContent className="p-2">
                <h3 className="font-medium text-xs line-clamp-1">{event.name}</h3>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {event.club?.type && event.club.type.charAt(0).toUpperCase() + event.club.type.slice(1)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation buttons */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={scrollLeft}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={scrollRight}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
