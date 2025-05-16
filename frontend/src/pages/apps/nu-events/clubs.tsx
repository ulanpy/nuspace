"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Users, Filter, ChevronLeft, ChevronRight, Heart } from "lucide-react"
import { Input } from "@/components/atoms/input"
import { Button } from "@/components/atoms/button"
import { Card } from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
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

interface Media {
  id: number
  url: string
}

interface PaginatedClubs {
  clubs: Club[]
  num_of_pages: number
}

// Helper function to get club type display text
const getClubTypeDisplay = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export default function ClubsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useUser()

  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedClubType, setSelectedClubType] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ clubId: number; action: () => void } | null>(null)

  // Fetch clubs
  const fetchClubs = async (page = 1, clubType = selectedClubType) => {
    setIsLoading(true)
    try {
      // Using mock API instead of real API call
      const data = mockApi.getClubs(page, 12, clubType)
      setClubs(data.clubs)
      setTotalPages(data.num_of_pages)
      setCurrentPage(page)
    } catch (error) {
      console.error("Error fetching clubs:", error)
      toast({
        title: "Error",
        description: "Failed to load clubs. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Search clubs
  const searchClubs = () => {
    // In a real app, we would have a search endpoint
    // For now, we'll just filter the clubs client-side
    if (!searchQuery.trim()) {
      fetchClubs()
      return
    }

    setIsLoading(true)
    try {
      const query = searchQuery.toLowerCase()
      const filteredClubs = mockApi
        .getClubs()
        .clubs.filter(
          (club) =>
            club.name.toLowerCase().includes(query) ||
            club.description.toLowerCase().includes(query) ||
            club.type.toLowerCase().includes(query),
        )

      setClubs(filteredClubs)
      setTotalPages(1)
      setCurrentPage(1)
    } catch (error) {
      console.error("Error searching clubs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Handle filter changes
  const applyFilters = () => {
    fetchClubs(1, selectedClubType)
    setShowFilters(false)
  }

  // Reset filters
  const resetFilters = () => {
    setSelectedClubType(null)
    fetchClubs(1, null)
    setShowFilters(false)
  }

  // Toggle follow club
  const toggleFollowClub = (clubId: number) => {
    if (!user) {
      setPendingAction({ clubId, action: () => toggleFollowClub(clubId) })
      setShowLoginModal(true)
      return
    }

    const updatedClub = mockApi.toggleFollowClub(clubId)
    if (updatedClub) {
      setClubs(clubs.map((club) => (club.id === clubId ? updatedClub : club)))
      toast({
        title: updatedClub.isFollowing ? "Following" : "Unfollowed",
        description: updatedClub.isFollowing
          ? `You are now following ${updatedClub.name}`
          : `You have unfollowed ${updatedClub.name}`,
      })
    }
  }

  // Handle login success
  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    if (pendingAction) {
      pendingAction.action()
      setPendingAction(null)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchClubs()
  }, [])

  // Loading skeleton
  const ClubSkeleton = () => (
    <Card className="overflow-hidden h-full">
      <div className="aspect-square bg-muted animate-pulse" />
      <div className="p-4">
        <div className="h-5 bg-muted animate-pulse rounded w-3/4 mb-2" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
      </div>
    </Card>
  )

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="flex items-center gap-1" onClick={() => navigate("/apps/nu-events")}>
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <h1 className="text-2xl font-bold">Clubs</h1>
      </div>

      {/* Search and filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clubs..."
            className="pl-9 pr-4 text-sm"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={(e) => e.key === "Enter" && searchClubs()}
          />
        </div>
        <Button variant="outline" onClick={searchClubs}>
          Search
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "bg-primary text-primary-foreground" : ""}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Club Type</h3>
              <div className="flex flex-wrap gap-2">
                {["academic", "professional", "recreational", "cultural", "sports", "social", "art", "technology"].map(
                  (type) => (
                    <Badge
                      key={type}
                      variant={selectedClubType === type ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedClubType(selectedClubType === type ? null : type)}
                    >
                      {getClubTypeDisplay(type)}
                    </Badge>
                  ),
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset
              </Button>
              <Button size="sm" onClick={applyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Clubs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <ClubSkeleton key={index} />
          ))}
        </div>
      ) : clubs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {clubs.map((club) => (
            <Card key={club.id} className="overflow-hidden h-full">
              <div
                className="aspect-square relative cursor-pointer"
                onClick={() => navigate(`/apps/nu-events/club/${club.id}`)}
              >
                {club.media && club.media.length > 0 ? (
                  <img
                    src={club.media[0].url || "/placeholder.svg"}
                    alt={club.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Users className="h-12 w-12 text-muted-foreground opacity-50" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2 z-10 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  {getClubTypeDisplay(club.type)}
                </Badge>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3
                      className="font-medium hover:text-primary cursor-pointer"
                      onClick={() => navigate(`/apps/nu-events/club/${club.id}`)}
                    >
                      {club.name}
                    </h3>
                    <div className="text-xs text-muted-foreground mt-1">{club.members} members</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={club.isFollowing ? "text-primary" : "text-muted-foreground"}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFollowClub(club.id)
                    }}
                  >
                    <Heart className={`h-5 w-5 ${club.isFollowing ? "fill-primary" : ""}`} />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-2">{club.followers} followers</div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No clubs found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {searchQuery
              ? "No clubs match your search criteria. Try a different search term."
              : selectedClubType
                ? `No ${selectedClubType} clubs found. Try a different filter.`
                : "There are no clubs available at the moment."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchClubs(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex items-center text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchClubs(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        title="Login Required"
        message="You need to be logged in to follow clubs."
      />
    </div>
  )
}
