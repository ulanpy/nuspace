import { Modal } from "../atoms/modal";

export function PrivacyModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy Policy"
      description="Learn how we collect, use, and store your data."
    >
      <div className="space-y-2 text-sm max-h-[70vh] overflow-y-auto pr-2">
        <p>
          <strong>1. General Provisions</strong>
          <br />
          1.1. This document explains what personal data we collect, how we
          store it, and how we use it in the nuspace.kz service and the
          @nuspaceBot on Telegram.
          <br />
          1.2. The service is non-commercial, designed for Nazarbayev University
          students, and all data are used solely to improve the user experience
          within the platform.
        </p>

        <p>
          <strong>2. What Data We Collect</strong>
        </p>
        <ul className="list-disc pl-4">
          <li>
            <strong>During Google OAuth2 Registration:</strong> full name, email
            address, profile photo URL
          </li>
          <li>
            <strong>When Linking a Telegram Account:</strong> Telegram User ID,
            optionally Telegram username
          </li>
          <li>
            <strong>Technical Logs:</strong> IP and User-Agent strings are not
            collected
          </li>
        </ul>

        <p>
          <strong>3. Purpose of Data Processing</strong>
          <br />
          To verify NU affiliation, link accounts, enable bot validation, and
          send reminders.
        </p>

        <p>
          <strong>4. Storage and Security</strong>
          <br />
          Data is stored securely, SSH access is key-only, and only one admin
          has access.
        </p>

        <p>
          <strong>5. Third-Party Services</strong>
          <br />
          We use Google Cloud Storage only for media files. No external
          analytics or data sharing.
        </p>

        <p>
          <strong>6. User Rights</strong>
          <br />
          You may unlink or delete your account by contacting @kamikadze24.
        </p>

        <p>
          <strong>7–10.</strong> Full policy includes data retention,
          encryption, backups, and contact info. See https://nuspace.kz/ for
          full updates.
        </p>
      </div>
    </Modal>
  );
}
