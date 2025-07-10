"use client";

import { ShoppingBag, Calendar, Coffee } from "lucide-react";
import { AppButton } from "../molecules/buttons/app-button";
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
      title: "Kupi&Prodai",
      href: "/apps/kupi-prodai",
      gradient:
        "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(37,99,235,0.15) 50%, rgba(29,78,216,0) 100%)",
      iconColor: "text-blue-500",
      delay: 0.1,
    },
    {
      icon: <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Campus Current",
      href: "/apps/nu-events",
      gradient:
        "radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(234,88,12,0.15) 50%, rgba(194,65,12,0) 100%)",
      iconColor: "text-orange-500",
      delay: 0.2,
    },
    {
      icon: <Coffee className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
      title: "Dorm Eats",
      href: "/apps/dorm-eats",
      gradient:
        "radial-gradient(circle, rgba(34,197,94,0.3) 0%, rgba(22,163,74,0.15) 50%, rgba(21,128,61,0) 100%)",
      iconColor: "text-green-500",
      delay: 0.3,
      comingSoon: true,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8">
      {apps.map((app) => (
        <AppButton key={app.title} {...app} />
      ))}
    </div>
  );
}
