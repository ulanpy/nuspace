"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { ShoppingBag, Calendar, Coffee, Users, TrendingUp, Clock, ChevronRight, Loader2 } from "lucide-react"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"

// Types for our personalized data
interface SalesAnalytics {
  totalSales: number
  activeListings: number
  views: number
  trend: number // percentage increase/decrease
}

interface ClubEvent {
  id: number
  name: string
  role: string
  nextMeeting: string
  location: string
}

interface StarredEvent {
  id: number
  title: string
  date: Date
  location: string
}

interface FavoriteFood {
  id: number
  name: string
  cafeteria: string
  price: number
  available: boolean
}

interface PersonalizedData {
  salesAnalytics: SalesAnalytics
  clubEvents: ClubEvent[]
  starredEvents: StarredEvent[]
  favoriteFoods: FavoriteFood[]
}

// Mock data - in a real app, this would come from API
const mockPersonalizedData: PersonalizedData = {
  salesAnalytics: {
    totalSales: 35000,
    activeListings: 3,
    views: 127,
    trend: 12,
  },
  clubEvents: [
    {
      id: 1,
      name: "Debate Club",
      role: "Member",
      nextMeeting: "Tomorrow, 5:00 PM",
      location: "Room 305",
    },
  ],
  starredEvents: [
    {
      id: 3,
      title: "Career Fair",
      date: new Date(2023, 7, 28, 11, 0),
      location: "Atrium",
    },
    {
      id: 5,
      title: "Research Symposium",
      date: new Date(2023, 7, 30, 9, 0),
      location: "Conference Hall",
    },
  ],
  favoriteFoods: [
    {
      id: 7,
      name: "Greek Salad",
      cafeteria: "Health Project",
      price: 1400,
      available: true,
    },
    {
      id: 13,
      name: "Beef Stew",
      cafeteria: "Free Flow",
      price: 1800,
      available: false,
    },
  ],
}

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

export function PersonalizedDashboard() {
  const [data, setData] = useState<PersonalizedData | null>(null)
  const [loading, setLoading] = useState(true)

  // Simulate API call
  useEffect(() => {
    const fetchData = async () => {
      // In a real app, this would be an API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setData(mockPersonalizedData)
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    } else {
      return (
        date.toLocaleDateString([], { month: "short", day: "numeric" }) +
        `, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      )
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold">Your Dashboard</h2>
        <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
          Customize
        </Button>
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Sales Analytics */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden h-full">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <ShoppingBag className="h-4 w-4 text-blue-500" />
                  </div>
                  <h3 className="font-medium">Kupi&Prodai</h3>
                </div>
                <Badge variant={data.salesAnalytics.trend >= 0 ? "outline" : "destructive"} className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {data.salesAnalytics.trend}%
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-lg font-semibold">{data.salesAnalytics.totalSales} ₸</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Active Listings</p>
                  <p className="text-lg font-semibold">{data.salesAnalytics.activeListings}</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">{data.salesAnalytics.views} views this week</div>

              <div className="mt-3 pt-3 border-t border-border/40">
                <Link
                  to="/apps/kupi-prodai"
                  className="flex items-center justify-end text-xs text-muted-foreground hover:text-foreground"
                >
                  <span>View all listings</span>
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Club Management */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden h-full">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <Users className="h-4 w-4 text-orange-500" />
                  </div>
                  <h3 className="font-medium">Club Management</h3>
                </div>
              </div>

              {data.clubEvents.length > 0 ? (
                <div className="space-y-3">
                  {data.clubEvents.map((club) => (
                    <div key={club.id} className="space-y-1">
                      <div className="flex justify-between">
                        <p className="font-medium text-sm">{club.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {club.role}
                        </Badge>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{club.nextMeeting}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{club.location}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">You're not part of any clubs yet</p>
              )}

              <div className="mt-3 pt-3 border-t border-border/40">
                <Link
                  to="/apps/nu-events"
                  className="flex items-center justify-end text-xs text-muted-foreground hover:text-foreground"
                >
                  <span>Explore clubs</span>
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Starred Events */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden h-full">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Calendar className="h-4 w-4 text-green-500" />
                  </div>
                  <h3 className="font-medium">Starred Events</h3>
                </div>
              </div>

              {data.starredEvents.length > 0 ? (
                <div className="space-y-3">
                  {data.starredEvents.map((event) => (
                    <div key={event.id} className="space-y-1">
                      <p className="font-medium text-sm">{event.title}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{event.location}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No starred events</p>
              )}

              <div className="mt-3 pt-3 border-t border-border/40">
                <Link
                  to="/apps/nu-events"
                  className="flex items-center justify-end text-xs text-muted-foreground hover:text-foreground"
                >
                  <span>View all events</span>
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Favorite Foods */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden h-full">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <Coffee className="h-4 w-4 text-red-500" />
                  </div>
                  <h3 className="font-medium">Favorite Foods</h3>
                </div>
              </div>

              {data.favoriteFoods.length > 0 ? (
                <div className="space-y-3">
                  {data.favoriteFoods.map((food) => (
                    <div key={food.id} className="space-y-1">
                      <div className="flex justify-between">
                        <p className="font-medium text-sm">{food.name}</p>
                        <p className="text-sm font-semibold">{food.price} ₸</p>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{food.cafeteria}</span>
                        <Badge variant={food.available ? "outline" : "secondary"} className="text-[10px] h-4 px-1">
                          {food.available ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No favorite foods</p>
              )}

              <div className="mt-3 pt-3 border-t border-border/40">
                <Link
                  to="/apps/dorm-eats"
                  className="flex items-center justify-end text-xs text-muted-foreground hover:text-foreground"
                >
                  <span>View all menus</span>
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}