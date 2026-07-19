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
  Copy,
  Search,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  findMatchingContacts,
  type ContactSearchResult,
} from "@/features/contacts/contact-search";
import { Input } from "@/components/atoms/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion";

type ContactType = "phone" | "email" | "web" | "location" | "hours";

interface ContactInfo {
  id?: string;
  type: ContactType;
  label?: string;
  value: string;
  extraInfo?: string;
}

type ServiceCategory =
  | "urgent-wellbeing"
  | "student-life"
  | "academic-support"
  | "campus-services";

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  contacts: ContactInfo[];
  icon: React.ReactNode;
  category: ServiceCategory;
  accent: string;
}

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  "urgent-wellbeing": "Urgent & wellbeing",
  "student-life": "Student life",
  "academic-support": "Academic support",
  "campus-services": "Campus services",
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as ServiceCategory[];

const SERVICES: ServiceItem[] = [
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
    icon: <ShieldAlert className="h-5 w-5" />,
    category: "urgent-wellbeing",
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
    icon: <LifeBuoy className="h-5 w-5" />,
    category: "urgent-wellbeing",
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
    icon: <Stethoscope className="h-5 w-5" />,
    category: "urgent-wellbeing",
    accent: "from-emerald-500/20",
  },
  {
    id: "fire-and-safety",
    name: "Fire and Safety",
    description: "Report fire hazards and safety concerns across campus facilities.",
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
    icon: <FireExtinguisher className="h-5 w-5" />,
    category: "urgent-wellbeing",
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
    category: "campus-services",
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
    category: "student-life",
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
    category: "student-life",
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
    category: "urgent-wellbeing",
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
    category: "academic-support",
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
    category: "academic-support",
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
    category: "campus-services",
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
    category: "student-life",
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
    category: "student-life",
    accent: "from-teal-500/20",
  },
];

const URGENT_CONTACT_IDS = [
  "campus-security-phone",
  "psychological-hotline",
  "on-duty-doctor",
  "fire-safety-phone",
] as const;

const URGENT_CONTACTS = URGENT_CONTACT_IDS.map((contactId) =>
  SERVICES.flatMap((service) => service.contacts).find(
    (contact) => contact.id === contactId,
  ),
).filter((contact): contact is ContactInfo => Boolean(contact));

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

function ContactRow({
  info,
  urgent = false,
}: {
  info: ContactInfo;
  urgent?: boolean;
}) {
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
      : info.value;

  const rowClasses = urgent
    ? "flex min-h-16 w-full items-center gap-3 py-3 text-left"
    : "flex min-h-16 w-full items-center gap-3 px-1 py-3 text-left";
  const interactiveClasses =
    "rounded-md transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const iconWrapper = (
    <span
      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${urgent
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground"
        }`}
      aria-hidden="true"
    >
      {icon}
    </span>
  );

  const handleCopy = async () => {
    const clipboard =
      typeof navigator !== "undefined" ? navigator.clipboard : undefined;

    if (!clipboard?.writeText) {
      toast({
        title: "Couldn't copy number",
        description: "Select the number and copy it manually.",
        variant: "error",
        duration: 2500,
      });
      return;
    }

    try {
      await clipboard.writeText(info.value);
      toast({
        title: "Number copied",
        description: info.value,
        variant: "success",
        duration: 2000,
      });
    } catch {
      toast({
        title: "Couldn't copy number",
        description: "Select the number and copy it manually.",
        variant: "error",
        duration: 2500,
      });
    }
  };

  const content = (
    <>
      {iconWrapper}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="break-words text-sm font-medium leading-tight text-foreground">
          {labelText}
        </span>
        {secondaryText && (
          <span
            className={`break-words text-sm leading-snug text-muted-foreground ${info.type === "web" ? "break-all" : ""}`}
          >
            {secondaryText}
          </span>
        )}
        {info.extraInfo && (
          <span className="break-words text-xs leading-snug text-muted-foreground">
            {info.extraInfo}
          </span>
        )}
      </span>
    </>
  );

  if (info.type === "phone" && href) {
    return (
      <div className={`${rowClasses} group`}>
        <a
          href={href}
          className={`flex min-w-0 flex-1 items-center gap-3 ${interactiveClasses}`}
          aria-label={`Call ${labelText} at ${info.value}`}
        >
          {content}
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Copy ${labelText} number`}
          title="Copy number"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={`${rowClasses} ${interactiveClasses}`}
        target={info.type === "web" ? "_blank" : undefined}
        rel={info.type === "web" ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }

  if (info.type === "hours") {
    return (
      <button
        type="button"
        className={`${rowClasses} ${interactiveClasses}`}
        onClick={() =>
          toast({ title: labelText, description: info.value, duration: 2000 })
        }
      >
        {content}
      </button>
    );
  }

  return <div className={rowClasses}>{content}</div>;
}

function UrgentHelp() {
  return (
    <section
      aria-labelledby="urgent-help-title"
      className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-4 sm:px-5"
    >
      <div className="mb-2 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
        <h2 id="urgent-help-title" className="text-lg font-semibold">
          Urgent help
        </h2>
      </div>
      <p className="mb-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Call the service that best matches your situation.
      </p>
      <div className="grid md:grid-cols-2 md:gap-x-6">
        {URGENT_CONTACTS.map((contact) => (
          <div
            key={contact.id}
            className="border-b border-destructive/15 last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0"
          >
            <ContactRow info={contact} urgent />
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactRows({
  serviceId,
  contacts,
}: {
  serviceId: string;
  contacts: ContactInfo[];
}) {
  return (
    <div className="grid border-t border-border md:grid-cols-2 md:gap-x-6">
      {contacts.map((contact, index) => (
        <div
          key={contact.id ?? `${serviceId}-${contact.type}-${index}`}
          className="border-b border-border last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0"
        >
          <ContactRow info={contact} />
        </div>
      ))}
    </div>
  );
}

function ServiceIcon({ service }: { service: ServiceItem }) {
  return (
    <div
      className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border/40 bg-gradient-to-br ${service.accent} to-transparent`}
      aria-hidden="true"
    >
      {service.icon}
    </div>
  );
}

function ContactSearchResults({
  results,
}: {
  results: ContactSearchResult<ServiceItem>[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {results.map(({ service, contacts }) => (
        <section
          key={service.id}
          aria-labelledby={`search-result-${service.id}`}
          className="overflow-hidden rounded-2xl border border-border bg-background"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <ServiceIcon service={service} />
            <div className="min-w-0">
              <h3
                id={`search-result-${service.id}`}
                className="text-base font-medium leading-tight"
              >
                {service.name}
              </h3>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                {service.description}
              </p>
            </div>
          </div>
          <div className="px-4">
            <ContactRows serviceId={service.id} contacts={contacts} />
          </div>
        </section>
      ))}
    </div>
  );
}

export function ContactsInfoSection() {
  const [query, setQuery] = React.useState("");
  const isSearching = query.trim().length > 0;

  const searchResults = React.useMemo(
    () => (isSearching ? findMatchingContacts(SERVICES, query) : []),
    [isSearching, query],
  );

  const groupedServices = React.useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        services: SERVICES.filter((service) => service.category === category),
      })),
    [],
  );

  const resultCount = searchResults.reduce(
    (count, result) => count + result.contacts.length,
    0,
  );

  return (
    <div className="flex w-full flex-col gap-8">
      <UrgentHelp />

      <section aria-labelledby="directory-title" className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="directory-title" className="text-xl font-semibold">
              Contact directory
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search by service, person, phone number, or email.
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <label htmlFor="contact-search" className="sr-only">
              Search contacts
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="contact-search"
              type="text"
              role="searchbox"
              inputMode="search"
              value={query}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(event.target.value)
              }
              placeholder="Search contacts"
              className="h-11 pl-9 pr-10"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                aria-label="Clear contact search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <p
          className={
            isSearching && resultCount > 0
              ? "text-sm text-muted-foreground"
              : "sr-only"
          }
          aria-live="polite"
        >
          {isSearching
            ? `${resultCount} ${resultCount === 1 ? "contact" : "contacts"} in ${searchResults.length} ${searchResults.length === 1 ? "service" : "services"}`
            : `${SERVICES.length} services available`}
        </p>

        {isSearching ? (
          searchResults.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <Search
                className="h-7 w-7 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <h3 className="font-medium">No contacts found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try another service, name, phone number, or email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="min-h-11 rounded-md px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Clear search
              </button>
            </div>
          ) : (
            <ContactSearchResults results={searchResults} />
          )
        ) : (
          <div className="flex flex-col gap-7">
            {groupedServices.map(({ category, services }) => (
              <section key={category} aria-labelledby={`${category}-title`}>
                <h3
                  id={`${category}-title`}
                  className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {CATEGORY_LABELS[category]}
                </h3>
                <Accordion
                  type="multiple"
                  className="rounded-2xl border border-border bg-background"
                >
                  {services.map((service) => (
                    <AccordionItem
                      key={service.id}
                      value={service.id}
                      className="px-3 last:border-b-0 sm:px-4"
                    >
                      <AccordionTrigger className="gap-3 py-4 hover:no-underline">
                        <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <ServiceIcon service={service} />
                          <div className="flex min-w-0 flex-col gap-1 text-left">
                            <span className="text-base font-medium leading-tight">
                              {service.name}
                            </span>
                            <span className="text-sm leading-snug text-muted-foreground">
                              {service.description}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ContactRows
                          serviceId={service.id}
                          contacts={service.contacts}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ContactsInfoSection;
