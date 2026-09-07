import type { ComponentConfig } from "@puckeditor/core"
import {
  Award,
  Bell,
  BookOpen,
  Camera,
  Check,
  Cloud,
  Cpu,
  Database,
  Feather,
  Film,
  Gift,
  Globe2,
  Heart,
  Lock,
  Mail,
  MapPin,
  Music,
  Palette,
  Phone,
  Rocket,
  Share2,
  Shield,
  Star,
  Target,
  ThumbsUp,
  TrendingUp,
  Truck,
  Users,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { withLayout, type WithLayout } from "@/features/page-editor/blocks/_lib"

type IconMapEntry = { Icon: LucideIcon; label: string }

const ICONS: IconMapEntry[] = [
  { Icon: Feather, label: "Feather" },
  { Icon: Star, label: "Star" },
  { Icon: Heart, label: "Heart" },
  { Icon: Zap, label: "Zap" },
  { Icon: Award, label: "Award" },
  { Icon: TrendingUp, label: "TrendingUp" },
  { Icon: Users, label: "Users" },
  { Icon: Globe2, label: "Globe" },
  { Icon: Camera, label: "Camera" },
  { Icon: BookOpen, label: "Book" },
  { Icon: Shield, label: "Shield" },
  { Icon: Truck, label: "Truck" },
  { Icon: Bell, label: "Bell" },
  { Icon: Check, label: "Check" },
  { Icon: Mail, label: "Mail" },
  { Icon: MapPin, label: "MapPin" },
  { Icon: Phone, label: "Phone" },
  { Icon: Cpu, label: "Cpu" },
  { Icon: Database, label: "Database" },
  { Icon: Rocket, label: "Rocket" },
  { Icon: ThumbsUp, label: "ThumbsUp" },
  { Icon: Target, label: "Target" },
  { Icon: Wifi, label: "Wifi" },
  { Icon: Cloud, label: "Cloud" },
  { Icon: Lock, label: "Lock" },
  { Icon: Share2, label: "Share" },
  { Icon: Gift, label: "Gift" },
  { Icon: Palette, label: "Palette" },
  { Icon: Music, label: "Music" },
  { Icon: Film, label: "Film" },
]

const iconOptions = ICONS.map(({ label }) => ({ label, value: label }))

export type CardProps = WithLayout<{
  title: string
  description: string
  icon?: string
  mode: "flat" | "card"
}>

function getIcon(name?: string): LucideIcon {
  return ICONS.find(({ label }) => label === name)?.Icon ?? Feather
}

const CardInner: ComponentConfig<CardProps> = {
  fields: {
    title: {
      type: "text",
      contentEditable: true,
    },
    description: {
      type: "textarea",
      contentEditable: true,
    },
    icon: {
      type: "select",
      options: iconOptions,
    },
    mode: {
      type: "radio",
      options: [
        { label: "card", value: "card" },
        { label: "flat", value: "flat" },
      ],
    },
  },
  defaultProps: {
    title: "Title",
    description: "Description",
    icon: "Feather",
    mode: "flat",
  },
  render: ({ title, icon, description, mode }) => {
    const Icon = getIcon(icon)
    const card = mode === "card"
    return (
      <div className="h-full">
        <div
          className={[
            "flex h-full flex-col items-center gap-4",
            card ? "max-w-full rounded-2xl bg-background p-5 shadow-sm" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-6" />
          </div>
          <div
            className={[
              "text-2xl",
              card ? "self-start text-left" : "text-center",
            ].join(" ")}
          >
            {title}
          </div>
          <div
            className={[
              "text-sm leading-relaxed font-light text-muted-foreground",
              card ? "self-start text-left" : "text-center",
            ].join(" ")}
          >
            {description}
          </div>
        </div>
      </div>
    )
  },
}

export const Card = withLayout(CardInner)
