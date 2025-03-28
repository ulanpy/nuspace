"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Users, BookOpen, Building, Star, Clock, MapPin } from "lucide-react"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { format } from "date-fns"

interface Event {
  id: number
  title: string
  date: Date
  location: string
  organizer: string
  organizerType: "club" | "admin" | "other"
  category: string
  image: string
  isFeatured: boolean
}

const events: Event[] = [
  {
    id: 1,
    title: "Freshman Orientation",
    date: new Date(2023, 7, 25, 10, 0),
    location: "Main Hall",
    organizer: "Student Affairs",
    organizerType: "admin",
    category: "Academic",
    image: "https://placehold.co/350x200",
    isFeatured: true,
  },
  {
    id: 2,
    title: "Debate Club Meeting",
    date: new Date(2023, 7, 26, 16, 30),
    location: "Room 305",
    organizer: "Debate Club",
    organizerType: "club",
    category: "Club",
    image: "https://placehold.co/350x200",
    isFeatured: false,
  },
  {
    id: 3,
    title: "Career Fair",
    date: new Date(2023, 7, 28, 11, 0),
    location: "Atrium",
    organizer: "Career Center",
    organizerType: "admin",
    category: "Career",
    image: "https://placehold.co/350x200",
    isFeatured: true,
  },
  {
    id: 4,
    title: "Movie Night",
    date: new Date(2023, 7, 27, 19, 0),
    location: "Student Lounge",
    organizer: "Film Society",
    organizerType: "club",
    category: "Entertainment",
    image: "https://placehold.co/350x200",
    isFeatured: false,
  },
  {
    id: 5,
    title: "Research Symposium",
    date: new Date(2023, 7, 30, 9, 0),
    location: "Conference Hall",
    organizer: "Research Department",
    organizerType: "admin",
    category: "Academic",
    image: "https://placehold.co/350x200",
    isFeatured: true,
  },
  {
    id: 6,
    title: "Hackathon",
    date: new Date(2023, 8, 2, 9, 0),
    location: "Computer Lab",
    organizer: "Tech Club",
    organizerType: "club",
    category: "Technology",
    image: "https://placehold.co/350x200",
    isFeatured: false,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
}

export default function NUEventsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [savedEvents, setSavedEvents] = useState<number[]>([])

  const toggleSave = (id: number) => {
    if (savedEvents.includes(id)) {
      setSavedEvents(savedEvents.filter((eventId) => eventId !== id))
    } else {
      setSavedEvents([...savedEvents, id])
    }
  }

  const getOrganizerIcon = (type: Event["organizerType"]) => {
    switch (type) {
      case "club":
        return <Users className="h-4 w-4" />
      case "admin":
        return <Building className="h-4 w-4" />
      case "other":
        return <BookOpen className="h-4 w-4" />
    }
  }

  const filteredEvents =
    activeTab === "all"
      ? events
      : events.filter((event) => (activeTab === "featured" ? event.isFeatured : event.organizerType === activeTab))

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">NU Events</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Discover events happening at Nazarbayev University</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search events..." className="pl-9 text-sm" />
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 text-xs sm:text-sm">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="club">Clubs</TabsTrigger>
          <TabsTrigger value="admin">University</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="pt-3 sm:pt-4">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={activeTab}
          >
            {filteredEvents.map((event) => (
              <motion.div key={event.id} variants={itemVariants}>
                <Card className="overflow-hidden h-full">
                  <div className="relative">
                    <img
                      src={event.image || "/placeholder.svg"}
                      alt={event.title}
                      className="object-cover w-full h-36 sm:h-48"
                    />
                    {event.isFeatured && (
                      <Badge className="absolute top-2 right-2 bg-yellow-500 text-white text-xs">Featured</Badge>
                    )}
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-1 sm:mb-2">
                      <h3 className="font-medium text-base sm:text-lg">{event.title}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        onClick={() => toggleSave(event.id)}
                      >
                        <Star
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${savedEvents.includes(event.id) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}
                        />
                      </Button>
                    </div>
                    <Badge variant="outline" className="mb-2 sm:mb-3 text-xs">
                      {event.category}
                    </Badge>
                    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{format(event.date, "EEEE, MMMM d, yyyy • h:mm a")}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
                        {getOrganizerIcon(event.organizerType)}
                        <span>{event.organizer}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

