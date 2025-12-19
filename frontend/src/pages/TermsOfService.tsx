import { ExternalLink, Mail, Phone } from "lucide-react";

const tosData = {
    title: "Terms of Service for nuspace.kz",
    lastUpdated: "2025-12-19",
    introduction: "Welcome to nuspace.kz. By accessing our website or using the @NUspaceBot, you agree to be bound by these Terms of Service. This is a non-commercial, student-led project created for the Nazarbayev University community.",
    sections: [
        {
            id: 1,
            title: "Eligibility",
            description: "This service is intended exclusively for current students, faculty, and staff of Nazarbayev University. By logging in via Google OAuth2, you must use your official @nu.edu.kz email address."
        },
        {
            id: 2,
            title: "Description of Service",
            description: "nuspace provides a platform for academic organization and Telegram-based reminders. We reserve the right to modify, suspend, or discontinue any part of the service at any time without prior notice."
        },
        {
            id: 3,
            title: "Acceptable Use",
            description: "Users agree not to:",
            items: [
                "Attempt to bypass authentication or probe the service for vulnerabilities.",
                "Use the @NUspaceBot to spam other users or infrastructure.",
                "Automate access to the site (scraping) without prior administrative consent.",
                "Impersonate other students or university officials."
            ]
        },
        {
            id: 4,
            title: "No Warranties (Disclaimer)",
            description: "The service is provided on an 'AS IS' and 'AS AVAILABLE' basis. While we strive for 100% uptime, we do not guarantee that reminders will always be delivered on time or that the service will be error-free. Use of the service is at your own risk."
        },
        {
            id: 5,
            title: "Limitation of Liability",
            description: "To the maximum extent permitted by the law of Kazakhstan, nuspace and its developers shall not be liable for any direct, indirect, or incidental damages resulting from your use of the service, including but not limited to missed academic deadlines or data loss."
        },
        {
            id: 6,
            title: "Account Termination",
            description: "We reserve the right to terminate or suspend access to our service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users of the service."
        },
        {
            id: 7,
            title: "Governing Law",
            description: "These terms are governed by and construed in accordance with the laws of the Republic of Kazakhstan."
        }
    ],
    contact: {
        message: "Questions about the Terms can be directed to the administrator through any of the following channels:",
        email: "ulan.sharipov@nu.edu.kz",
        phone: "+77072818516",
        telegram: "https://t.me/kamikadze24"
    }
};

export default function TermsOfService() {
    return (
        <div className="container max-w-4xl mx-auto py-12 px-4 space-y-8">
            {/* Header */}
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">{tosData.title}</h1>
                <p className="text-muted-foreground">Last updated: {tosData.lastUpdated}</p>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <p className="leading-relaxed">{tosData.introduction}</p>
                </div>
            </div>

            {/* Sections */}
            <div className="space-y-8">
                {tosData.sections.map((section) => (
                    <section key={section.id} className="space-y-3">
                        <h2 className="text-2xl font-bold">{section.id}. {section.title}</h2>

                        {/* Render Description */}
                        {section.description && (
                            <p className="leading-relaxed text-muted-foreground">
                                {section.description}
                            </p>
                        )}

                        {/* Render List if items exist */}
                        {section.items && (
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                {section.items.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ))}
            </div>

            {/* Contact */}
            <div className="mt-12 pt-8 border-t border-border">
                <h2 className="text-2xl font-bold mb-6">Contact</h2>
                <p className="text-muted-foreground mb-6">{tosData.contact.message}</p>
                <div className="grid gap-4 md:grid-cols-3">
                    <a href={`mailto:${tosData.contact.email}`} className="block p-4 rounded-lg border border-border hover:border-foreground hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center gap-2">
                            <Mail className="h-6 w-6" />
                            <span className="font-medium">Email Support</span>
                            <span className="text-xs text-muted-foreground break-all">{tosData.contact.email}</span>
                        </div>
                    </a>
                    <a href={`tel:${tosData.contact.phone.replace(/\s+/g, '')}`} className="block p-4 rounded-lg border border-border hover:border-foreground hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center gap-2">
                            <Phone className="h-6 w-6" />
                            <span className="font-medium">Phone</span>
                            <span className="text-xs text-muted-foreground">{tosData.contact.phone}</span>
                        </div>
                    </a>
                    <a href={tosData.contact.telegram} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-lg border border-border hover:border-foreground hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center gap-2">
                            <ExternalLink className="h-6 w-6" />
                            <span className="font-medium">Telegram</span>
                            <span className="text-xs text-muted-foreground">@kamikadze24</span>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}
