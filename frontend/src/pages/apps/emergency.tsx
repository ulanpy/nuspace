"use client";

import { ContactsInfoSection } from "@/components/organisms/contacts-info-section";

export default function ContactsPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div className="w-full">
        <h2 className="text-2xl sm:text-3xl font-semibold">Contacts & Essential Services</h2>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Save these contacts. In an emergency, call campus security or local services immediately.
        </p>
      </div>
      <ContactsInfoSection />
    </div>
  );
}


