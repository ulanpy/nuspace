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
  MessageCircle,
  FileText,
  Stethoscope,
} from "lucide-react";
import { useTelegramMiniApp } from "@/hooks/useTelegramMiniApp";
import { useToast } from "@/hooks/use-toast";

type ContactType = "phone" | "email" | "web" | "location" | "hours";

interface ContactInfo {
  type: ContactType;
  label?: string;
  value: string;
  extraInfo?: string;
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
      {
        type: "web",
        label: "Campus access form",
        value: "https://forms.gle/WdG6Piik6tSThyKc7",
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
    icon: <LifeBuoy className="h-5 w-5" />,
    accent: "from-sky-500/20",
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
    icon: <Stethoscope className="h-5 w-5" />,
    accent: "from-emerald-500/20",
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
      { type: "web", label: "Support Dmitriy", value: "https://t.me/spooktaken" },
      { type: "web", label: "Support Amira", value: "https://t.me/mirutghts" },
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
    description: "Academic advising offices located in Block 9 (rooms 9106, 9112, 9113) for all schools.",
    contacts: [
      { type: "email", label: "AAO", value: "aao@nu.edu.kz" },
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
      { type: "email", label: "NUSOM - Bauyrzhan Seitbayev", value: "bauyrzhan.seitbayev@nu.edu.kz" },
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
      {
        type: "email",
        label: "Roof and Toilet Leaks",
        value: "usmcomments@nu.edu.kz",
      },
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
  const { isMiniApp } = useTelegramMiniApp();
  const { toast } = useToast();

  const icon = {
    phone: <Phone className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
    web: info.value.includes("t.me")
      ? <MessageCircle className="h-4 w-4" />
      : info.value.includes("docs.google.com/forms")
        ? <FileText className="h-4 w-4" />
        : <Globe className="h-4 w-4" />,
    location: <MapPin className="h-4 w-4" />,
    hours: <Clock className="h-4 w-4" />,
  }[info.type];

  const href = contactToHref(info.type, info.value);

  const labelText = info.label ?? info.type;
  const secondaryText =
    info.type === "hours"
      ? undefined
      : info.type === "web"
        ? info.value.replace(/^https?:\/\//, "")
        : info.value;

  const baseButtonClasses =
    "flex w-full min-h-[64px] items-start gap-3 rounded-lg border border-border/50 bg-muted px-3 py-2 text-left text-xs text-foreground/90 shadow-sm transition-colors";
  const interactiveStates =
    "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:cursor-default disabled:bg-muted";

  const iconWrapper = (
    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-background/60 text-muted-foreground">
      {icon}
    </span>
  );

  const handleClick = async () => {
    if (info.type === "phone") {
      const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
      if (clipboard?.writeText) {
        try {
          await clipboard.writeText(info.value);
          toast({
            title: "Number copied",
            description: `${info.value} copied to clipboard`,
            variant: "success",
            duration: 2000,
          });
        } catch {
          toast({
            title: "Copy failed",
            description: "Couldn't copy number. Please copy manually.",
            variant: "error",
            duration: 2500,
          });
        }
      } else {
        toast({
          title: "Copy failed",
          description: "Couldn't copy number. Please copy manually.",
          variant: "error",
          duration: 2500,
        });
      }
      return;
    }

    if (info.type === "email") {
      if (isMiniApp) {
        const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
        if (clipboard?.writeText) {
          try {
            await clipboard.writeText(info.value);
            toast({
              title: "Email copied",
              description: `${info.value} copied to clipboard`,
              variant: "success",
              duration: 2000,
            });
          } catch {
            toast({
              title: "Copy failed",
              description: "Couldn't copy email. Please copy manually.",
              variant: "error",
              duration: 2500,
            });
          }
        } else {
          toast({
            title: "Copy failed",
            description: "Couldn't copy email. Please copy manually.",
            variant: "error",
            duration: 2500,
          });
        }
        return;
      }

      if (href && typeof window !== "undefined") {
        window.location.href = href;
      }
      return;
    }

    if (info.type === "web" && href && typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    if (info.type === "hours") {
      toast({
        title: labelText,
        description: info.value,
        duration: 2000,
      });
      return;
    }

    if (href && typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  const ButtonContent = (
    <span className="flex min-w-0 flex-1 items-start gap-3">
      {iconWrapper}
      <span className="flex min-w-0 flex-col gap-1">
        {info.extraInfo && (
          <span className="break-words text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {info.extraInfo}
          </span>
        )}
        <span className="break-words text-sm font-medium leading-tight text-foreground">
          {labelText}
        </span>
        {secondaryText && (
          <span
            className={`text-xs leading-snug text-muted-foreground break-words ${
              info.type === "web" ? "break-all" : ""
            }`}
          >
            {secondaryText}
          </span>
        )}
      </span>
    </span>
  );

  const buttonProps = {
    type: "button" as const,
    className: `${baseButtonClasses} ${interactiveStates}`,
    onClick: handleClick,
  };

  const isPassive = info.type === "location";

  return (
    <div className="flex w-full flex-col">
      <button
        {...buttonProps}
        className={`${buttonProps.className} ${isPassive ? "hover:bg-muted" : ""}`}
        disabled={isPassive}
      >
        {ButtonContent}
      </button>
    </div>
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
              <div className="mt-2 grid gap-2 md:grid-cols-2">
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


