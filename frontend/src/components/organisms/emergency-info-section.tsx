"use client";

import * as React from "react";
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  ShieldAlert,
  Hospital,
  LifeBuoy,
  FireExtinguisher,
  Headset,
  GraduationCap,
  Building2,
  Wrench,
  Users2,
} from "lucide-react";

type ContactType = "phone" | "email" | "web" | "location" | "hours";

interface ContactInfo {
  type: ContactType;
  label?: string;
  value: string;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  contacts: ContactInfo[];
  icon: React.ReactNode;
  accent?: string; // tailwind color e.g. "from-red-500/20"
}

const SERVICES: ServiceItem[] = [
  {
    id: "campus-security",
    name: "Campus Security",
    description:
      "24/7 response for on-campus incidents, escorts, and safety assistance.",
    contacts: [
      { type: "phone", label: "Emergency", value: "+7 (777) 000-112" },
      { type: "phone", label: "Non‑emergency", value: "+7 (777) 000-113" },
      { type: "web", label: "Safety tips", value: "https://example.edu/safety" },
    ],
    icon: <ShieldAlert className="h-5 w-5" />,
    accent: "from-red-500/20",
  },
  {
    id: "health-center",
    name: "Student Health Center",
    description:
      "Primary care, urgent care, vaccinations, and health certificates.",
    contacts: [
      { type: "phone", label: "Front desk", value: "+7 (777) 100-200" },
      { type: "email", label: "Appointments", value: "health@university.edu" },
      { type: "hours", value: "Mon–Fri 08:30–18:00" },
    ],
    icon: <Hospital className="h-5 w-5" />,
    accent: "from-green-500/20",
  },
  {
    id: "counseling",
    name: "Counseling & Wellness",
    description:
      "Confidential mental health counseling, crisis support, and workshops.",
    contacts: [
      { type: "phone", label: "Hotline (24/7)", value: "+7 (777) 100-911" },
      { type: "email", label: "General", value: "counsel@university.edu" },
      { type: "web", label: "Book session", value: "https://example.edu/counsel" },
    ],
    icon: <LifeBuoy className="h-5 w-5" />,
    accent: "from-sky-500/20",
  },
  {
    id: "fire-emergency",
    name: "Fire & Safety",
    description:
      "Report fires, alarms, hazards. Learn evacuation routes and procedures.",
    contacts: [
      { type: "phone", label: "On‑campus emergency", value: "112" },
      { type: "web", label: "Evacuation map", value: "https://example.edu/evac-map" },
    ],
    icon: <FireExtinguisher className="h-5 w-5" />,
    accent: "from-orange-500/20",
  },
  {
    id: "it-helpdesk",
    name: "IT Help Desk",
    description:
      "Account access, Wi‑Fi, LMS issues, software requests, and device support.",
    contacts: [
      { type: "phone", label: "Support", value: "+7 (777) 300-404" },
      { type: "email", label: "Tickets", value: "help@university.edu" },
      { type: "web", label: "Knowledge base", value: "https://it.example.edu" },
    ],
    icon: <Headset className="h-5 w-5" />,
    accent: "from-indigo-500/20",
  },
  {
    id: "student-affairs",
    name: "Student Affairs",
    description:
      "Student conduct, housing concerns, leave support, and general advocacy.",
    contacts: [
      { type: "phone", label: "Office", value: "+7 (777) 200-123" },
      { type: "email", label: "Inquiries", value: "affairs@university.edu" },
      { type: "location", label: "Main", value: "Building A, 2nd Floor" },
    ],
    icon: <Users2 className="h-5 w-5" />,
    accent: "from-violet-500/20",
  },
  {
    id: "academic-advising",
    name: "Academic Advising",
    description:
      "Degree plans, course selection, academic petitions, and graduation checks.",
    contacts: [
      { type: "web", label: "Book advisor", value: "https://example.edu/advising" },
      { type: "email", label: "Desk", value: "advising@university.edu" },
    ],
    icon: <GraduationCap className="h-5 w-5" />,
    accent: "from-blue-500/20",
  },
  {
    id: "facilities",
    name: "Facilities & Maintenance",
    description:
      "Report building issues, broken equipment, or environmental hazards.",
    contacts: [
      { type: "phone", label: "Dispatch", value: "+7 (777) 550-600" },
      { type: "web", label: "Submit request", value: "https://example.edu/fixit" },
    ],
    icon: <Wrench className="h-5 w-5" />,
    accent: "from-amber-500/20",
  },
  {
    id: "international",
    name: "International Office",
    description:
      "Visa support, letters, insurance, and travel/emergency documentation.",
    contacts: [
      { type: "phone", label: "Desk", value: "+7 (777) 700-800" },
      { type: "email", label: "Support", value: "intl@university.edu" },
    ],
    icon: <Building2 className="h-5 w-5" />,
    accent: "from-teal-500/20",
  },
];

function contactToHref(type: ContactType, value: string): string | undefined {
  switch (type) {
    case "phone":
      return `tel:${value.replace(/[^+\d]/g, "")}`;
    case "email":
      return `mailto:${value}`;
    case "web":
      return value;
    case "location":
      return `https://maps.google.com/?q=${encodeURIComponent(value)}`;
    default:
      return undefined;
  }
}

function ContactChip({ info }: { info: ContactInfo }) {
  const icon = {
    phone: <Phone className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
    web: <Globe className="h-4 w-4" />,
    location: <MapPin className="h-4 w-4" />,
    hours: <Clock className="h-4 w-4" />,
  }[info.type];

  const href = contactToHref(info.type, info.value);
  const content = (
    <span className="inline-flex items-center gap-1.5 text-xs">
      {icon}
      <span className="truncate">
        {info.label ? `${info.label}: ` : ""}
        {info.value}
      </span>
    </span>
  );

  if (!href || info.type === "hours") {
    return (
      <div className="px-2 py-1 rounded-md bg-muted text-foreground/90 border border-border/50">
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      target={info.type === "web" ? "_blank" : undefined}
      rel={info.type === "web" ? "noopener noreferrer" : undefined}
      className="px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground/90 border border-border/50 transition-colors"
    >
      {content}
    </a>
  );
}

export function EmergencyInfoSection() {
  return (
    <section className="w-full max-w-5xl mx-auto">
      <div className="w-full mb-4">
        <h2 className="text-2xl sm:text-3xl font-semibold">Emergency & Essential Services</h2>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Save these contacts. In an emergency, call campus security or local services immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICES.map((service) => (
          <article
            key={service.id}
            className="relative rounded-xl border border-border/60 bg-background/60 backdrop-blur-sm shadow-sm overflow-hidden"
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${service.accent ?? "from-primary/10"} to-transparent opacity-70`}
              aria-hidden
            />
            <div className="relative p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-background/80 border border-border/50 shadow-sm">
                  {service.icon}
                </div>
                <h3 className="text-base sm:text-lg font-medium leading-none">
                  {service.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">{service.description}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {service.contacts.map((c, idx) => (
                  <ContactChip key={`${service.id}-${c.type}-${idx}`} info={c} />
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default EmergencyInfoSection;


