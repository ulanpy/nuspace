/**
 * Privacy policy and terms of service, carried over verbatim from the old app.
 *
 * The wording is a commitment to users and a legal statement under Kazakhstan's
 * personal data law, so it is copied exactly rather than rewritten. Both
 * documents share one shape because they share one renderer.
 */

export interface LegalSection {
  title: string
  description?: string
  points?: string[]
}

export interface LegalDocument {
  title: string
  lastUpdated: string
  introduction: string
  sections: LegalSection[]
  contact: {
    message: string
    email: string
    phone: string
    telegram: string
    telegramHandle: string
  }
}

const CONTACT = {
  email: "ulan.sharipov@nu.edu.kz",
  phone: "+77072818516",
  telegram: "https://t.me/kamikadze24",
  telegramHandle: "@kamikadze24",
}

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy for nuspace.kz",
  lastUpdated: "2025-12-25",
  introduction:
    "This document explains what personal data we collect, how we store it, and how we use it in the nuspace.kz service and the @nuspaceBot on Telegram. This service is a non-commercial, student-led project designed specifically for Nazarbayev University students.",
  sections: [
    {
      title: "General Provisions",
      points: [
        "By logging into the Service via Google OAuth2 or linking your Telegram account, you provide express consent to the processing of your data.",
        "The service operates in strict compliance with the Law of the Republic of Kazakhstan 'On Personal Data and their Protection'.",
        "This service is intended for users who are at least 18 years of age or possess legal consent from a parent or guardian.",
      ],
    },
    {
      title: "What Data We Collect",
      points: [
        "Google OAuth2: We receive your full name, NU email address (@nu.edu.kz), and profile photo URL to verify your student status.",
        "Telegram: We store your unique Telegram User ID and username to provide bot functionality.",
        "Cookies: We use essential cookies only to maintain your secure login session. No tracking or marketing cookies are used.",
        "Technical Logs: To maximize privacy, we do NOT collect or store user IP addresses or User-Agent strings.",
      ],
    },
    {
      title: "Purpose of Data Processing",
      description:
        "Your data is used exclusively to verify NU affiliation, link your web and bot accounts, and enable automated updates about your appeals.",
    },
    {
      title: "Storage and Security",
      description:
        "We implement industry-standard security measures. Data is stored in encrypted databases. Administrative access is strictly limited to authorized personnel via encrypted SSH channels with key-only authentication. We do not sell, trade, or rent your data to third parties.",
    },
    {
      title: "Data Sharing and Disclosure",
      description:
        "We do not share, transfer, or disclose your Google user data (Full Name, Email, Profile Photo) to any third parties. We do not sell, trade, or rent your personal data. Your data is only used internally to provide the service. The only exceptions where data interacts with third parties are for technical infrastructure, as described below:",
      points: [
        "Google Cloud: We use Google Cloud Platform solely for data hosting and storage. Your data remains encrypted and is not accessed by Google for other purposes.",
        "Telegram: We do not share your Google user data with Telegram. The Telegram integration uses only your Telegram User ID to route notifications; your Google identity (email/name) is never transferred to Telegram servers.",
      ],
    },
    {
      title: "Data Retention & Deletion",
      points: [
        "Retention: Your data is stored only as long as your account is active.",
        "Right to be Forgotten: To request a permanent and total removal of all your data from our servers, contact the administrator via Telegram.",
        "Inactivity: Accounts inactive for more than 12 months may be subject to automatic deletion.",
      ],
    },
    {
      title: "Changes to This Policy",
      description:
        "We may update this Privacy Policy to reflect changes in our practices or for legal reasons. Significant updates will be notified via the @nuspaceBot or through a prominent notice on the nuspace.kz homepage.",
    },
  ],
  contact: {
    message:
      "For privacy-related inquiries, please contact us through any of the following channels:",
    ...CONTACT,
  },
}

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of Service for nuspace.kz",
  lastUpdated: "2025-12-19",
  introduction:
    "Welcome to nuspace.kz. By accessing our website or using the @nuspaceBot, you agree to be bound by these Terms of Service. This is a non-commercial, student-led project created for the Nazarbayev University community.",
  sections: [
    {
      title: "Eligibility",
      description:
        "This service is intended exclusively for current students, faculty, and staff of Nazarbayev University. By logging in via Google OAuth2, you must use your official @nu.edu.kz email address.",
    },
    {
      title: "Description of Service",
      description:
        "nuspace provides a platform for academic organization and Telegram-based reminders. We reserve the right to modify, suspend, or discontinue any part of the service at any time without prior notice.",
    },
    {
      title: "Acceptable Use",
      description: "Users agree not to:",
      points: [
        "Attempt to bypass authentication or probe the service for vulnerabilities.",
        "Use the @nuspaceBot to spam other users or infrastructure.",
        "Automate access to the site (scraping) without prior administrative consent.",
        "Impersonate other students or university officials.",
      ],
    },
    {
      title: "No Warranties (Disclaimer)",
      description:
        "The service is provided on an 'AS IS' and 'AS AVAILABLE' basis. While we strive for 100% uptime, we do not guarantee that reminders will always be delivered on time or that the service will be error-free. Use of the service is at your own risk.",
    },
    {
      title: "Limitation of Liability",
      description:
        "To the maximum extent permitted by the law of Kazakhstan, nuspace and its developers shall not be liable for any direct, indirect, or incidental damages resulting from your use of the service, including but not limited to missed academic deadlines or data loss.",
    },
    {
      title: "Account Termination",
      description:
        "We reserve the right to terminate or suspend access to our service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users of the service.",
    },
    {
      title: "Governing Law",
      description:
        "These terms are governed by and construed in accordance with the laws of the Republic of Kazakhstan.",
    },
  ],
  contact: {
    message:
      "Questions about the Terms can be directed to the administrator through any of the following channels:",
    ...CONTACT,
  },
}
