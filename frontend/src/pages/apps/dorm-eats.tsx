"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Coffee, Clock, DollarSign, Star, MapPin, Search } from "lucide-react"
import { Input } from "../../components/ui/input"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion"

interface Cafeteria {
  id: string
  name: string
  location: string
  hours: string
  priceRange: 1 | 2 | 3
  rating: number
  image: string
}

interface MenuItem {
  id: number
  name: string
  price: number
  category: string
  description: string
  isAvailable: boolean
}

interface MenuCategory {
  name: string
  items: MenuItem[]
}

const cafeterias: Cafeteria[] = [
  {
    id: "corner",
    name: "Corner",
    location: "Block 1, Ground Floor",
    hours: "8:00 AM - 8:00 PM",
    priceRange: 2,
    rating: 4.2,
    image: "https://placehold.co/350x200",
  },
  {
    id: "health-project",
    name: "Health Project",
    location: "Block 3, First Floor",
    hours: "9:00 AM - 7:00 PM",
    priceRange: 3,
    rating: 4.5,
    image: "https://placehold.co/350x200",
  },
  {
    id: "free-flow",
    name: "Free Flow",
    location: "Main Building, Second Floor",
    hours: "8:00 AM - 6:00 PM",
    priceRange: 2,
    rating: 3.9,
    image: "https://placehold.co/350x200",
  },
  {
    id: "green-food",
    name: "Green Food",
    location: "Library Building, Ground Floor",
    hours: "9:00 AM - 5:00 PM",
    priceRange: 1,
    rating: 4.0,
    image: "https://placehold.co/350x200",
  },
]

const menus: Record<string, MenuCategory[]> = {
  corner: [
    {
      name: "Breakfast",
      items: [
        {
          id: 1,
          name: "Breakfast Sandwich",
          price: 1200,
          category: "Breakfast",
          description: "Egg, cheese, and bacon on a toasted bun",
          isAvailable: true,
        },
        {
          id: 2,
          name: "Oatmeal",
          price: 800,
          category: "Breakfast",
          description: "Served with honey and fruits",
          isAvailable: true,
        },
      ],
    },
    {
      name: "Lunch",
      items: [
        {
          id: 3,
          name: "Chicken Wrap",
          price: 1500,
          category: "Lunch",
          description: "Grilled chicken with vegetables in a tortilla wrap",
          isAvailable: true,
        },
        {
          id: 4,
          name: "Beef Burger",
          price: 1800,
          category: "Lunch",
          description: "Beef patty with lettuce, tomato, and special sauce",
          isAvailable: false,
        },
      ],
    },
    {
      name: "Drinks",
      items: [
        {
          id: 5,
          name: "Coffee",
          price: 600,
          category: "Drinks",
          description: "Freshly brewed coffee",
          isAvailable: true,
        },
        {
          id: 6,
          name: "Tea",
          price: 500,
          category: "Drinks",
          description: "Assorted tea flavors",
          isAvailable: true,
        },
      ],
    },
  ],
  "health-project": [
    {
      name: "Salads",
      items: [
        {
          id: 7,
          name: "Greek Salad",
          price: 1400,
          category: "Salads",
          description: "Fresh vegetables with feta cheese and olives",
          isAvailable: true,
        },
        {
          id: 8,
          name: "Chicken Caesar Salad",
          price: 1600,
          category: "Salads",
          description: "Romaine lettuce with grilled chicken and Caesar dressing",
          isAvailable: true,
        },
      ],
    },
    {
      name: "Bowls",
      items: [
        {
          id: 9,
          name: "Quinoa Bowl",
          price: 1700,
          category: "Bowls",
          description: "Quinoa with roasted vegetables and tahini dressing",
          isAvailable: true,
        },
        {
          id: 10,
          name: "Acai Bowl",
          price: 1900,
          category: "Bowls",
          description: "Acai blend topped with granola and fresh fruits",
          isAvailable: false,
        },
      ],
    },
    {
      name: "Smoothies",
      items: [
        {
          id: 11,
          name: "Green Smoothie",
          price: 1200,
          category: "Smoothies",
          description: "Spinach, banana, and apple",
          isAvailable: true,
        },
        {
          id: 12,
          name: "Berry Blast",
          price: 1300,
          category: "Smoothies",
          description: "Mixed berries with yogurt",
          isAvailable: true,
        },
      ],
    },
  ],
  "free-flow": [
    {
      name: "Main Dishes",
      items: [
        {
          id: 13,
          name: "Beef Stew",
          price: 1800,
          category: "Main Dishes",
          description: "Slow-cooked beef with vegetables",
          isAvailable: true,
        },
        {
          id: 14,
          name: "Chicken Curry",
          price: 1600,
          category: "Main Dishes",
          description: "Chicken in curry sauce with rice",
          isAvailable: true,
        },
      ],
    },
    {
      name: "Sides",
      items: [
        {
          id: 15,
          name: "French Fries",
          price: 800,
          category: "Sides",
          description: "Crispy potato fries",
          isAvailable: true,
        },
        {
          id: 16,
          name: "Mashed Potatoes",
          price: 700,
          category: "Sides",
          description: "Creamy mashed potatoes with gravy",
          isAvailable: false,
        },
      ],
    },
    {
      name: "Desserts",
      items: [
        {
          id: 17,
          name: "Chocolate Cake",
          price: 900,
          category: "Desserts",
          description: "Rich chocolate cake with frosting",
          isAvailable: true,
        },
        {
          id: 18,
          name: "Ice Cream",
          price: 700,
          category: "Desserts",
          description: "Vanilla ice cream with toppings",
          isAvailable: true,
        },
      ],
    },
  ],
  "green-food": [
    {
      name: "Vegetarian",
      items: [
        {
          id: 19,
          name: "Vegetable Stir Fry",
          price: 1400,
          category: "Vegetarian",
          description: "Mixed vegetables stir-fried with tofu",
          isAvailable: true,
        },
        {
          id: 20,
          name: "Falafel Wrap",
          price: 1300,
          category: "Vegetarian",
          description: "Falafel with hummus and vegetables in a wrap",
          isAvailable: true,
        },
      ],
    },
    {
      name: "Soups",
      items: [
        {
          id: 21,
          name: "Lentil Soup",
          price: 900,
          category: "Soups",
          description: "Hearty lentil soup with vegetables",
          isAvailable: true,
        },
        {
          id: 22,
          name: "Tomato Soup",
          price: 800,
          category: "Soups",
          description: "Creamy tomato soup with croutons",
          isAvailable: false,
        },
      ],
    },
    {
      name: "Drinks",
      items: [
        {
          id: 23,
          name: "Fresh Juice",
          price: 1000,
          category: "Drinks",
          description: "Freshly squeezed fruit juice",
          isAvailable: true,
        },
        {
          id: 24,
          name: "Herbal Tea",
          price: 600,
          category: "Drinks",
          description: "Various herbal tea options",
          isAvailable: true,
        },
      ],
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

export default function DormEatsPage() {
  const [activeCafeteria, setActiveCafeteria] = useState("corner")
  const [searchQuery, setSearchQuery] = useState("")

  const renderPriceRange = (range: number) => {
    return Array(3)
      .fill(0)
      .map((_, i) => (
        <DollarSign
          key={i}
          className={`h-3 w-3 sm:h-4 sm:w-4 ${i < range ? "text-foreground" : "text-muted-foreground opacity-40"}`}
        />
      ))
  }

  const filteredMenu = menus[activeCafeteria]
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((category) => category.items.length > 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Dorm Eats</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Explore cafeteria menus at Nazarbayev University</p>
      </div>

      <Tabs defaultValue="corner" className="w-full" onValueChange={setActiveCafeteria}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 text-xs sm:text-sm">
          {cafeterias.map((cafeteria) => (
            <TabsTrigger key={cafeteria.id} value={cafeteria.id}>
              {cafeteria.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {cafeterias.map((cafeteria) => (
          <TabsContent key={cafeteria.id} value={cafeteria.id} className="pt-3 sm:pt-4">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" key={cafeteria.id}>
              <motion.div variants={itemVariants}>
                <Card className="mb-4 sm:mb-6">
                  <div className="relative">
                    <img
                      src={cafeteria.image || "/placeholder.svg"}
                      alt={cafeteria.name}
                      className="object-cover w-full h-32 sm:h-48"
                    />
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-1 sm:mb-2">
                      <h3 className="font-medium text-base sm:text-lg">{cafeteria.name}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm">{cafeteria.rating}</span>
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{cafeteria.location}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{cafeteria.hours}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
                        <div className="flex">{renderPriceRange(cafeteria.priceRange)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <div className="mb-4 sm:mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search menu..."
                    className="pl-8 sm:pl-9 text-xs sm:text-sm h-8 sm:h-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {filteredMenu.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {filteredMenu.map((category, index) => (
                    <motion.div key={category.name} variants={itemVariants}>
                      <AccordionItem value={category.name}>
                        <AccordionTrigger className="text-sm sm:text-base py-2 sm:py-4">
                          {category.name}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 sm:space-y-4">
                            {category.items.map((item) => (
                              <div
                                key={item.id}
                                className={`p-2 sm:p-3 rounded-lg border ${
                                  item.isAvailable ? "border-border/40" : "border-border/20 bg-muted/50 opacity-60"
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <h4 className="font-medium text-xs sm:text-sm">{item.name}</h4>
                                      {!item.isAvailable && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] sm:text-xs px-1 py-0 h-4 sm:h-5"
                                        >
                                          Out of stock
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                                      {item.description}
                                    </p>
                                  </div>
                                  <span className="font-bold text-xs sm:text-sm">{item.price} ₸</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <Coffee className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">No menu items found</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Try adjusting your search or check back later
                  </p>
                </div>
              )}
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

