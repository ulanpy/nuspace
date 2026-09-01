import type { LucideIcon } from "lucide-react"
import {
  Building2,
  FireExtinguisher,
  GraduationCap,
  Headset,
  LifeBuoy,
  ShieldAlert,
  Stethoscope,
  Users2,
  Wrench,
} from "lucide-react"

/**
 * The campus contacts directory. Static data, not an API resource.
 *
 * In the previous app this lived inside an 812-line component alongside the UI
 * and JSX icon elements. Here it is plain data: icons are referenced by name
 * and resolved at render, so the directory can be read and edited without
 * touching React.
 */

export type ContactType = "phone" | "email" | "web" | "location" | "hours"

export type ServiceCategory =
  "urgent-wellbeing" | "student-life" | "academic-support" | "campus-services"

export interface ContactInfo {
  id?: string
  type: ContactType
  label?: string
  value: string
  extraInfo?: string
}

export type IconName =
  | "Building2"
  | "FireExtinguisher"
  | "GraduationCap"
  | "Headset"
  | "LifeBuoy"
  | "ShieldAlert"
  | "Stethoscope"
  | "Users2"
  | "Wrench"

export interface ServiceItem {
  id: string
  name: string
  description: string
  contacts: ContactInfo[]
  icon: IconName
  category: ServiceCategory
}

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  "urgent-wellbeing": "Urgent & wellbeing",
  "student-life": "Student life",
  "academic-support": "Academic support",
  "campus-services": "Campus services",
}

/** Order categories appear in. Listed explicitly so it survives key reordering. */
export const CATEGORY_ORDER: ServiceCategory[] = [
  "urgent-wellbeing",
  "student-life",
  "academic-support",
  "campus-services",
]

export const ICONS: Record<IconName, LucideIcon> = {
  Building2,
  FireExtinguisher,
  GraduationCap,
  Headset,
  LifeBuoy,
  ShieldAlert,
  Stethoscope,
  Users2,
  Wrench,
}

export const SERVICES: ServiceItem[] = [
  {
    id: "campus-security",
    name: "Campus Security",
    description:
      "24/7 campus security dispatch and emergency response for immediate incidents.",
    contacts: [
      {
        id: "campus-security-phone",
        type: "phone",
        label: "Campus Security",
        value: "+7 (717) 270-62-56",
      },
      {
        type: "web",
        label: "Incident report form",
        value:
          "https://docs.google.com/forms/d/e/1FAIpQLSe7ANcHNvVAc0DDygHLYxG1N7716iJ1NJqQyw7_Upi0XABsfg/viewform",
      },
      {
        type: "web",
        label: "Campus access form",
        value: "https://forms.gle/WdG6Piik6tSThyKc7",
      },
    ],
    icon: "ShieldAlert",
    category: "urgent-wellbeing",
  },
  {
    id: "psychological-support",
    name: "Psychological Support",
    description:
      "Confidential psychological support and counseling coordination through PCS.",
    contacts: [
      { type: "web", label: "Telegram @pcs_nu", value: "https://t.me/pcs_nu" },
      {
        type: "phone",
        label: "City Mental Health Center",
        value: "+7 (7172) 27-38-28",
        extraInfo: "Alt: +7 (7172) 54-76-03",
      },
      {
        type: "phone",
        label: "National Hotline (Domestic Violence, Bullying)",
        value: "111",
      },
      {
        id: "psychological-hotline",
        type: "phone",
        label: "Unified Psychological Service (24/7)",
        value: "150",
        extraInfo: "WhatsApp: +7 708 10 608 10",
      },
      {
        type: "web",
        label: "Unified Psychological Service (WhatsApp)",
        value: "https://wa.me/77081060810",
      },
    ],
    icon: "LifeBuoy",
    category: "urgent-wellbeing",
  },
  {
    id: "university-health-center",
    name: "University Health Center (UHC)",
    description:
      "Medical appointments, on-duty doctor support, and psychological services through the UHC.",
    contacts: [
      { type: "phone", label: "UHC Appointment", value: "+7 (7172) 69-26-06" },
      { type: "phone", label: "UHC Appointment", value: "+7 (7172) 69-26-16" },
      {
        type: "phone",
        label: "UHC Appointment",
        value: "+7 (7172) 69-26-08",
        extraInfo: "Hours: Mon-Fri 8:00-20:00, Sat 9:00-13:00",
      },
      {
        id: "on-duty-doctor",
        type: "phone",
        label: "On-duty Doctor",
        value: "+7 702 853 61 30",
        extraInfo: "Block D3 (19), room 19201 | When UHC is closed",
      },
      {
        type: "phone",
        label: "UHC Psychologist/Psychiatrist",
        value: "+7 (7172) 70-26-16",
      },
      {
        type: "phone",
        label: "UHC Psychologist/Psychiatrist",
        value: "+7 (7172) 70-26-08",
      },
      {
        type: "phone",
        label: "UHC Psychologist/Psychiatrist",
        value: "+7 (7172) 70-26-06",
      },
    ],
    icon: "Stethoscope",
    category: "urgent-wellbeing",
  },
  {
    id: "fire-and-safety",
    name: "Fire and Safety",
    description:
      "Report fire hazards and safety concerns across campus facilities.",
    contacts: [
      {
        id: "fire-safety-phone",
        type: "phone",
        label: "Fire & Safety",
        value: "+7 (717) 270-62-62",
      },
      {
        type: "web",
        label: "Report form",
        value:
          "https://docs.google.com/forms/d/e/1FAIpQLSe7ANcHNvVAc0DDygHLYxG1N7716iJ1NJqQyw7_Upi0XABsfg/viewform",
      },
    ],
    icon: "FireExtinguisher",
    category: "urgent-wellbeing",
  },
  {
    id: "it-helpdesk",
    name: "IT Help Desk",
    description:
      "Technical assistance, account access, and IT service requests.",
    contacts: [
      {
        type: "web",
        label: "Helpdesk portal",
        value: "https://helpdesk.nu.edu.kz/",
      },
    ],
    icon: "Headset",
    category: "campus-services",
  },
  {
    id: "student-housing",
    name: "Student Housing",
    description:
      "Housing assignments, residence support, and residential services.",
    contacts: [
      { type: "email", label: "General", value: "student_housing@nu.edu.kz" },
      {
        type: "email",
        label: "Samal Tastambekova",
        value: "samal.tastambekova@nu.edu.kz",
      },
      { type: "email", label: "Yerzhan Kani", value: "yerzhan.kani@nu.edu.kz" },
    ],
    icon: "Building2",
    category: "student-life",
  },
  {
    id: "student-advocacy",
    name: "Student Advocacy",
    description:
      "Student support office for advocacy, wellbeing, and harassment reporting.",
    contacts: [
      {
        type: "email",
        label: "Student support",
        value: "student_support@nu.edu.kz",
      },
      { type: "email", label: "AHC", value: "ahc@nu.edu.kz" },
      {
        type: "email",
        label: "Daniyar Kossumbayev",
        value: "daniyar.kossumbayev@nu.edu.kz",
      },
      {
        type: "email",
        label: "Assima Seitaliyeva",
        value: "assima.seitaliyeva@nu.edu.kz",
      },
      {
        type: "email",
        label: "SRC support",
        value: "student.rights@nu.edu.kz",
      },
      {
        type: "web",
        label: "Support Dmitriy",
        value: "https://t.me/spooktaken",
      },
      { type: "web", label: "Support Amira", value: "https://t.me/mirutghts" },
    ],
    icon: "Users2",
    category: "student-life",
  },
  {
    id: "anti-harassment",
    name: "Anti-harassment",
    description:
      "Dedicated contacts for reporting harassment and seeking follow-up.",
    contacts: [
      { type: "email", label: "AHC", value: "ahc@nu.edu.kz" },
      {
        type: "email",
        label: "Daniyar Kossumbayev",
        value: "daniyar.kossumbayev@nu.edu.kz",
      },
      {
        type: "email",
        label: "Assima Seitaliyeva",
        value: "assima.seitaliyeva@nu.edu.kz",
      },
    ],
    icon: "ShieldAlert",
    category: "urgent-wellbeing",
  },
  {
    id: "academic-advising",
    name: "Academic Advising",
    description:
      "Academic advising offices located in Block 9 (rooms 9106, 9112, 9113) for all schools.",
    contacts: [{ type: "email", label: "AAO", value: "aao@nu.edu.kz" }],
    icon: "GraduationCap",
    category: "academic-support",
  },
  {
    id: "school-admins",
    name: "School Administrators",
    description:
      "School-specific administrators for academic and student support.",
    contacts: [
      {
        type: "email",
        label: "SSH - Gulden Kassenova",
        value: "gulden.kassenova@nu.edu.kz",
      },
      {
        type: "email",
        label: "SSH - Anel Kaliyeva",
        value: "akaliyeva@nu.edu.kz",
      },
      {
        type: "email",
        label: "SSH - Aigerim Kuttubayeva",
        value: "aigerim.kuttubayeva@nu.edu.kz",
      },
      {
        type: "email",
        label: "SEDS - Yenlik Molgozhdarova",
        value: "yenlik.molgozhdarova@nu.edu.kz",
      },
      {
        type: "email",
        label: "SEDS - Laura Kabdylmanova",
        value: "laura.kabdylmanova@nu.edu.kz",
      },
      {
        type: "email",
        label: "SEDS - Dana Maratova",
        value: "d.maratova@nu.edu.kz",
      },
      {
        type: "email",
        label: "SEDS - Aruzhan Iskakova",
        value: "aruzhan.iskakova@nu.edu.kz",
      },
      {
        type: "email",
        label: "SMG - Balzhan Bektursinova",
        value: "balzhan.bektursinova@nu.edu.kz",
      },
      {
        type: "email",
        label: "NUSOM - Bauyrzhan Seitbayev",
        value: "bauyrzhan.seitbayev@nu.edu.kz",
      },
    ],
    icon: "GraduationCap",
    category: "academic-support",
  },
  {
    id: "facilities",
    name: "Facilities and Maintenance",
    description:
      "Report issues with furniture, plumbing, or electrical systems.",
    contacts: [
      { type: "email", label: "Service desk", value: "servicedesk@nu.edu.kz" },
      {
        type: "email",
        label: "Roof and Toilet Leaks",
        value: "usmcomments@nu.edu.kz",
      },
    ],
    icon: "Wrench",
    category: "campus-services",
  },
  {
    id: "block-managers",
    name: "Block Managers",
    description:
      "Residence block managers for on-site assistance and escalation.",
    contacts: [
      {
        type: "phone",
        label: "Amina Amangeldinova",
        value: "+7 (7172) 70-58-34",
        extraInfo: "Blocks 11-19 (D1-D3)",
      },
      {
        type: "phone",
        label: "Nailya Bulekpayeva",
        value: "+7 (7172) 70-64-10",
        extraInfo: "Block 20 (D4)",
      },
      {
        type: "phone",
        label: "Gulmira Yerkeblankyzy",
        value: "+7 (7172) 69-49-08",
        extraInfo: "Block 22 (D5)",
      },
      {
        type: "phone",
        label: "Zhanna Kopeyeva",
        value: "+7 (7172) 70-66-51",
        extraInfo: "Block 23 (D6)",
      },
      {
        type: "phone",
        label: "Irina Temchenko",
        value: "+7 (7172) 69-26-55",
        extraInfo: "Block 24 (D7)",
      },
      {
        type: "phone",
        label: "Sandugash Turlybayeva",
        value: "+7 (7172) 70-65-71",
        extraInfo: "Block 25 (D8)",
      },
      {
        type: "phone",
        label: "Salidat Baidauletova",
        value: "+7 (7172) 70-64-61",
        extraInfo: "Block 26 (D9)",
      },
      {
        type: "phone",
        label: "Dina Kast",
        value: "+7 (7172) 69-46-73",
        extraInfo: "Block 27 (D10)",
      },
    ],
    icon: "Building2",
    category: "student-life",
  },
  {
    id: "international",
    name: "International Office",
    description:
      "Office of International Students and Scholars Services for visa and travel support.",
    contacts: [{ type: "email", label: "OISS", value: "oiss@nu.edu.kz" }],
    icon: "Building2",
    category: "student-life",
  },
]
