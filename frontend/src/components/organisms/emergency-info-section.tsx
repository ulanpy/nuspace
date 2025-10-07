"use client";

import * as React from "react";
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  ShieldAlert,
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
      "24/7 campus security dispatch and emergency response for immediate incidents.",
    contacts: [
      { type: "phone", label: "Phone", value: "+7 (717) 270-62-56" },
      {
        type: "web",
        label: "Incident report form",
        value:
          "https://docs.google.com/forms/d/e/1FAIpQLSe7ANcHNvVAc0DDygHLYxG1N7716iJ1NJqQyw7_Upi0XABsfg/viewform",
      },
    ],
    icon: <ShieldAlert className="h-5 w-5" />,
    accent: "from-red-500/20",
  },
  {
    id: "psychological-support",
    name: "Psychological Support",
    description:
      "Confidential psychological support and counseling coordination through PCS.",
    contacts: [
      { type: "phone", label: "Telegram hotline", value: "+7 (775) 759-38-44" },
      { type: "web", label: "@pcs_nu", value: "https://t.me/pcs_nu" },
    ],
    icon: <LifeBuoy className="h-5 w-5" />,
    accent: "from-sky-500/20",
  },
  {
    id: "fire-and-safety",
    name: "Fire and Safety",
    description: "Report fire hazards and safety concerns across campus facilities.",
    contacts: [
      { type: "phone", label: "Phone", value: "+7 (717) 270-62-62" },
      {
        type: "web",
        label: "Report form",
        value:
          "https://docs.google.com/forms/d/e/1FAIpQLSe7ANcHNvVAc0DDygHLYxG1N7716iJ1NJqQyw7_Upi0XABsfg/viewform",
      },
    ],
    icon: <FireExtinguisher className="h-5 w-5" />,
    accent: "from-orange-500/20",
  },
  {
    id: "it-helpdesk",
    name: "IT Help Desk",
    description: "Technical assistance, account access, and IT service requests.",
    contacts: [
      { type: "web", label: "Helpdesk portal", value: "https://helpdesk.nu.edu.kz/" },
    ],
    icon: <Headset className="h-5 w-5" />,
    accent: "from-indigo-500/20",
  },
  {
    id: "student-housing",
    name: "Student Housing",
    description: "Housing assignments, residence support, and residential services.",
    contacts: [
      { type: "email", label: "General", value: "student_housing@nu.edu.kz" },
      { type: "email", label: "Samal Tastambekova", value: "samal.tastambekova@nu.edu.kz" },
      { type: "email", label: "Yerzhan Kani", value: "yerzhan.kani@nu.edu.kz" },
    ],
    icon: <Building2 className="h-5 w-5" />,
    accent: "from-amber-500/20",
  },
  {
    id: "student-advocacy",
    name: "Student Advocacy",
    description:
      "Student support office for advocacy, wellbeing, and harassment reporting.",
    contacts: [
      { type: "email", label: "Student support", value: "student_support@nu.edu.kz" },
      { type: "email", label: "AHC", value: "ahc@nu.edu.kz" },
      { type: "email", label: "Daniyar Kossumbayev", value: "daniyar.kossumbayev@nu.edu.kz" },
      { type: "email", label: "Assima Seitaliyeva", value: "assima.seitaliyeva@nu.edu.kz" },
      { type: "email", label: "SRC support", value: "student.rights@nu.edu.kz" },
      { type: "web", label: "Telegram Dmitriy", value: "https://t.me/spooktaken" },
      { type: "web", label: "Telegram Amira", value: "https://t.me/mirutghts" },
    ],
    icon: <Users2 className="h-5 w-5" />,
    accent: "from-violet-500/20",
  },
  {
    id: "anti-harassment",
    name: "Anti-harassment",
    description: "Dedicated contacts for reporting harassment and seeking follow-up.",
    contacts: [
      { type: "email", label: "AHC", value: "ahc@nu.edu.kz" },
      { type: "email", label: "Daniyar Kossumbayev", value: "daniyar.kossumbayev@nu.edu.kz" },
      { type: "email", label: "Assima Seitaliyeva", value: "assima.seitaliyeva@nu.edu.kz" },
    ],
    icon: <ShieldAlert className="h-5 w-5" />,
    accent: "from-rose-500/20",
  },
  {
    id: "academic-advising",
    name: "Academic Advising",
    description: "Academic advising offices located in Block 9 for all schools.",
    contacts: [
      { type: "location", label: "Block 9 office", value: "9106, 9112, 9113" },
    ],
    icon: <GraduationCap className="h-5 w-5" />,
    accent: "from-blue-500/20",
  },
  {
    id: "school-admins",
    name: "School Administrators",
    description: "School-specific administrators for academic and student support.",
    contacts: [
      { type: "email", label: "SSH - Gulden Kassenova", value: "gulden.kassenova@nu.edu.kz" },
      { type: "email", label: "SSH - Anel Kaliyeva", value: "akaliyeva@nu.edu.kz" },
      { type: "email", label: "SSH - Aigerim Kuttubayeva", value: "aigerim.kuttubayeva@nu.edu.kz" },
      { type: "email", label: "SEDS - Yenlik Molgozhdarova", value: "yenlik.molgozhdarova@nu.edu.kz" },
      { type: "email", label: "SEDS - Laura Kabdylmanova", value: "laura.kabdylmanova@nu.edu.kz" },
      { type: "email", label: "SEDS - Dana Maratova", value: "d.maratova@nu.edu.kz" },
      { type: "email", label: "SEDS - Aruzhan Iskakova", value: "aruzhan.iskakova@nu.edu.kz" },
      { type: "email", label: "SMG - Balzhan Bektursinova", value: "balzhan.bektursinova@nu.edu.kz" },
    ],
    icon: <GraduationCap className="h-5 w-5" />,
    accent: "from-purple-500/20",
  },
  {
    id: "facilities",
    name: "Facilities and Maintenance",
    description: "Report issues with furniture, plumbing, or electrical systems.",
    contacts: [
      { type: "email", label: "Service desk", value: "servicedesk@nu.edu.kz" },
    ],
    icon: <Wrench className="h-5 w-5" />,
    accent: "from-amber-500/20",
  },
  {
    id: "block-managers",
    name: "Block Managers",
    description: "Residence block managers for on-site assistance and escalation.",
    contacts: [
      {
        type: "phone",
        label: "Blocks 11-19 - Amina Amangeldinova",
        value: "+7 (7172) 70-58-34",
      },

      {
        type: "phone",
        label: "Block 20 - Nailya Bulekpayeva",
        value: "+7 (7172) 70-64-10",
      },
      {
        type: "phone",
        label: "Block 22 - Gulmira Yerkeblankyzy",
        value: "+7 (7172) 69-49-08",
      },
      {
        type: "phone",
        label: "Block 23 - Zhanna Kopeyeva",
        value: "+7 (7172) 70-66-51",
      },
      {
        type: "phone",
        label: "Block 24 - Irina Temchenko",
        value: "+7 (7172) 69-26-55",
      },
      {
        type: "phone",
        label: "Block 25 - Sandugash Turlybayeva",
        value: "+7 (7172) 70-65-71",
      },
      {
        type: "phone",
        label: "Block 26 - Salidat Baidauletova",
        value: "+7 (7172) 70-64-61",
      },
      {
        type: "phone",
        label: "Block 27 - Dina Kast",
        value: "+7 (7172) 69-46-73",
      }
    ],
    icon: <Building2 className="h-5 w-5" />,
    accent: "from-rose-500/20",
  },
  {
    id: "international",
    name: "International Office",
    description:
      "Office of International Students and Scholars Services for visa and travel support.",
    contacts: [
      { type: "email", label: "OISS", value: "oiss@nu.edu.kz" },
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
      return undefined; // No links for location info
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
  
  // Check if it's a desktop interface (screen width > 768px)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;
  
  const labelText = info.label || info.type;
  const displayText =
    info.type === "phone" && isDesktop
      ? info.label
        ? `${info.label}: ${info.value}`
        : info.value
      : labelText;

  const textClasses =
    info.type === "phone" && isDesktop
      ? "whitespace-normal break-words text-left"
      : "truncate";

  const content = (
    <span className="inline-flex items-start gap-1.5 text-xs">
      {icon}
      <span className={textClasses}>{displayText}</span>
    </span>
  );

  // For phone numbers on desktop, show as plain text
  if (info.type === "phone" && isDesktop) {
    return (
      <div className="px-2 py-1 rounded-md bg-muted text-foreground/90 border border-border/50">
        {content}
      </div>
    );
  }

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
            className="relative rounded-xl border border-border/60 bg-background/60 backdrop-blur-sm shadow-sm overflow-hidden h-fit"
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


