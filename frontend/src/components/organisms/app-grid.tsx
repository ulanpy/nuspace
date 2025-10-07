"use client";

import { ShoppingBag, Calendar, BookOpen, Users, ShieldAlert } from "lucide-react";
import { AppButton } from "../molecules/buttons/app-button";
import { ROUTES } from "@/data/routes";

interface AppButtonProps {
  icon: React.ReactNode;
  title: string;
  href: string;
  gradient: string;
  iconColor: string;
  delay?: number;
  comingSoon?: boolean;
}

export function AppGrid() {
  const apps: AppButtonProps[] = [
    {
      icon: <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Marketplace",
      href: ROUTES.APPS.KUPI_PRODAI.ROOT,
      gradient:
        "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(37,99,235,0.15) 50%, rgba(29,78,216,0) 100%)",
      iconColor: "text-blue-500",
      delay: 0.1,
    },
    {
      icon: <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Events",
      href: ROUTES.APPS.CAMPUS_CURRENT.ROOT,
      gradient:
        "radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(234,88,12,0.15) 50%, rgba(194,65,12,0) 100%)",
      iconColor: "text-orange-500",
      delay: 0.2,
    },
    {
      icon: <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Courses",
      href: ROUTES.APPS.GRADE_STATISTICS.ROOT,
      gradient:
        "radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(147,51,234,0.15) 50%, rgba(126,34,206,0) 100%)",
      iconColor: "text-purple-500",
      delay: 0.3,
    },
    {
      icon: <Users className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Communities",
      href: ROUTES.APPS.COMMUNITIES.ROOT,
      gradient:
        "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(37,99,235,0.15) 50%, rgba(29,78,216,0) 100%)",
      iconColor: "text-blue-500",
      delay: 0.35,
    },
    {
      icon: <ShieldAlert className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Emergency",
      href: ROUTES.APPS.EMERGENCY.ROOT,
      gradient:
        "radial-gradient(circle, rgba(244,63,94,0.3) 0%, rgba(225,29,72,0.15) 50%, rgba(190,24,60,0) 100%)",
      iconColor: "text-rose-500",
      delay: 0.45,
    },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-5 sm:gap-6 md:gap-8">
      {apps.map((app) => (
        <AppButton key={app.title} {...app} />
      ))}
    </div>
  );
}
