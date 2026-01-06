import { Mail, Phone, ExternalLink } from 'lucide-react'

const privacyData = {
  title: 'Privacy Policy for nuspace.kz',
  lastUpdated: '2025-12-25',
  introduction: 'This document explains what personal data we collect, how we store it, and how we use it in the nuspace.kz service and the @NUspaceBot on Telegram. This service is a non-commercial, student-led project designed specifically for Nazarbayev University students.',
  sections: [
    {
      id: 1,
      title: 'General Provisions',
      points: [
        'By logging into the Service via Google OAuth2 or linking your Telegram account, you provide express consent to the processing of your data.',
        "The service operates in strict compliance with the Law of the Republic of Kazakhstan 'On Personal Data and their Protection'.",
        'This service is intended for users who are at least 18 years of age or possess legal consent from a parent or guardian.'
      ]
    },
    {
      id: 2,
      title: 'What Data We Collect',
      points: [
        'Google OAuth2: We receive your full name, NU email address (@nu.edu.kz), and profile photo URL to verify your student status.',
        'Telegram: We store your unique Telegram User ID and username to provide bot functionality.',
        'Cookies: We use essential cookies only to maintain your secure login session. No tracking or marketing cookies are used.',
        'Technical Logs: To maximize privacy, we do NOT collect or store user IP addresses or User-Agent strings.'
      ]
    },
    {
      id: 3,
      title: 'Purpose of Data Processing',
      description: 'Your data is used exclusively to verify NU affiliation, link your web and bot accounts, and enable automated updates about your appeals.'
    },
    {
      id: 4,
      title: 'Storage and Security',
      description: 'We implement industry-standard security measures. Data is stored in encrypted databases. Administrative access is strictly limited to authorized personnel via encrypted SSH channels with key-only authentication. We do not sell, trade, or rent your data to third parties.'
    },
    {
      id: 5,
      title: 'Data Sharing and Disclosure',
      description: 'We do not share, transfer, or disclose your Google user data (Full Name, Email, Profile Photo) to any third parties. We do not sell, trade, or rent your personal data. Your data is only used internally to provide the service. The only exceptions where data interacts with third parties are for technical infrastructure, as described below:',
      points: [
        'Google Cloud: We use Google Cloud Platform solely for data hosting and storage. Your data remains encrypted and is not accessed by Google for other purposes.',
        'Telegram: We do not share your Google user data with Telegram. The Telegram integration uses only your Telegram User ID to route notifications; your Google identity (email/name) is never transferred to Telegram servers.'
      ]
    },
    {
      id: 6,
      title: 'Data Retention & Deletion',
      points: [
        'Retention: Your data is stored only as long as your account is active.',
        'Right to be Forgotten: To request a permanent and total removal of all your data from our servers, contact the administrator via Telegram.',
        'Inactivity: Accounts inactive for more than 12 months may be subject to automatic deletion.'
      ]
    },
    {
      id: 7,
      title: 'Changes to This Policy',
      description: 'We may update this Privacy Policy to reflect changes in our practices or for legal reasons. Significant updates will be notified via the @NUspaceBot or through a prominent notice on the nuspace.kz homepage.'
    }
  ],
  contact: {
    message: 'For privacy-related inquiries, please contact us through any of the following channels:',
    email: 'ulan.sharipov@nu.edu.kz',
    phone: '+77072818516',
    telegram: 'https://t.me/kamikadze24'
  }
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">{privacyData.title}</h1>
        <p className="text-muted-foreground">Last updated: {privacyData.lastUpdated}</p>
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <p className="leading-relaxed">{privacyData.introduction}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {privacyData.sections.map((section) => (
          <section key={section.id} className="space-y-3">
            <h2 className="text-2xl font-bold">{section.id}. {section.title}</h2>

            {/* Render Paragraph if description exists */}
            {section.description && (
              <p className="leading-relaxed text-muted-foreground">
                {section.description}
              </p>
            )}

            {/* Render List if points exist */}
            {section.points && (
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                {section.points.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* Contact */}
      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
        <p className="text-muted-foreground mb-6">{privacyData.contact.message}</p>
        <div className="grid gap-4 md:grid-cols-3">
          <a href={`mailto:${privacyData.contact.email}`} className="block p-4 rounded-lg border border-border hover:border-foreground hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center gap-2">
              <Mail className="h-6 w-6" />
              <span className="font-medium">Email Support</span>
              <span className="text-xs text-muted-foreground break-all">{privacyData.contact.email}</span>
            </div>
          </a>
          <a href={`tel:${privacyData.contact.phone.replace(/\s+/g, '')}`} className="block p-4 rounded-lg border border-border hover:border-foreground hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center gap-2">
              <Phone className="h-6 w-6" />
              <span className="font-medium">Phone</span>
              <span className="text-xs text-muted-foreground">{privacyData.contact.phone}</span>
            </div>
          </a>
          <a href={privacyData.contact.telegram} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-lg border border-border hover:border-foreground hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center gap-2">
              <ExternalLink className="h-6 w-6" />
              <span className="font-medium">Telegram</span>
              <span className="text-xs text-muted-foreground">@kamikadze24</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
