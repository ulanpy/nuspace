"use client"

import type React from "react"

import { motion } from "framer-motion"
import { useTheme } from "./theme-provider"
import { ShoppingBag, Calendar, Coffee } from "lucide-react"
import { Link } from "react-router-dom"

interface AppButtonProps {
  icon: React.ReactNode
  title: string
  href: string
  gradient: string
  iconColor: string
  delay?: number
}

const AppButton = ({ icon, title, href, gradient, iconColor, delay = 0 }: AppButtonProps) => {
  const { theme } = useTheme()
  const isDarkTheme = theme === "dark"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: delay,
        duration: 0.5,
        type: "spring",
        stiffness: 100,
        damping: 15,
      }}
      whileHover="hover"
      className="flex flex-col items-center gap-1 sm:gap-2"
    >
      <Link to={href} className="block">
        <motion.div
          className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-lg border border-border/40 shadow-lg flex items-center justify-center"
          whileHover={{
            scale: 1.05,
            y: -5,
            transition: { type: "spring", stiffness: 400, damping: 10 },
          }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            className="absolute inset-0 rounded-2xl opacity-0"
            style={{ background: gradient }}
            variants={{
              hover: {
                opacity: isDarkTheme ? 0.15 : 0.1,
                transition: { duration: 0.3 },
              },
            }}
          />
          <motion.div
            className={`absolute -inset-2 bg-gradient-radial from-transparent ${
              isDarkTheme
                ? "via-blue-400/10 via-30% via-purple-400/10 via-60% via-red-400/10 via-90%"
                : "via-blue-400/5 via-30% via-purple-400/5 via-60% via-red-400/5 via-90%"
            } to-transparent rounded-3xl z-0 pointer-events-none opacity-0`}
            variants={{
              hover: {
                opacity: 1,
                scale: 1.2,
                transition: { duration: 0.3 },
              },
            }}
          />
          <span className={`text-xl sm:text-2xl ${iconColor}`}>{icon}</span>
        </motion.div>
      </Link>
      <span className="text-xs sm:text-sm font-medium text-foreground">{title}</span>
    </motion.div>
  )
}

export function AppGrid() {
  const apps: AppButtonProps[] = [
    {
      icon: <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Kupi&Prodai",
      href: "/apps/kupi-prodai",
      gradient: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(37,99,235,0.15) 50%, rgba(29,78,216,0) 100%)",
      iconColor: "text-blue-500",
      delay: 0.1,
    },
    {
      icon: <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "NU Events",
      href: "/apps/nu-events",
      gradient: "radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(234,88,12,0.15) 50%, rgba(194,65,12,0) 100%)",
      iconColor: "text-orange-500",
      delay: 0.2,
    },
    {
      icon: <Coffee className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Dorm Eats",
      href: "/apps/dorm-eats",
      gradient: "radial-gradient(circle, rgba(34,197,94,0.3) 0%, rgba(22,163,74,0.15) 50%, rgba(21,128,61,0) 100%)",
      iconColor: "text-green-500",
      delay: 0.3,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8">
      {apps.map((app) => (
        <AppButton key={app.title} {...app} />
      ))}
    </div>
  )
}

