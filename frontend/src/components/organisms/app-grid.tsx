"use client";

import { Calendar, BookOpen, Users, Shield, Info } from "lucide-react";
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
      icon: <Info className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Contacts",
      href: ROUTES.CONTACTS,
      gradient:
        "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(37,99,235,0.15) 50%, rgba(29,78,216,0) 100%)",
      iconColor: "text-sky-500",
      delay: 0.5,
    },
    {
      icon: <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Events",
      href: ROUTES.EVENTS.ROOT,
      gradient:
        "radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(234,88,12,0.15) 50%, rgba(194,65,12,0) 100%)",
      iconColor: "text-orange-500",
      delay: 0.2,
    },
    {
      icon: <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Courses",
      href: ROUTES.COURSES,
      gradient:
        "radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(147,51,234,0.15) 50%, rgba(126,34,206,0) 100%)",
      iconColor: "text-purple-500",
      delay: 0.3,
    },
    {
      icon: <Shield className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Sgotinish",
      href: ROUTES.SGOTINISH.ROOT,
      gradient:
        "radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(5,150,105,0.15) 50%, rgba(4,120,87,0) 100%)",
      iconColor: "text-emerald-500",
      delay: 0.4,
    },
    {
      icon: <Users className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Communities",
      href: ROUTES.COMMUNITIES.ROOT,
      gradient:
        "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(37,99,235,0.15) 50%, rgba(29,78,216,0) 100%)",
      iconColor: "text-blue-500",
      delay: 0.35,
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
