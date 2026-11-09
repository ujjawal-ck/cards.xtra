/**
 * privacyContent.ts — copy for the Privacy Policy screen.
 *
 * Verbatim from Figma "legal/privacy-policy" (3685:197516), with ONE added
 * section — "Device Permissions & Usage Access" — required for the Google
 * Play listing because the (optional) Cashback Reminder feature requests the
 * sensitive PACKAGE_USAGE_STATS ("Usage access") permission and notifications
 * (the reminder is a notification; the app no longer uses SYSTEM_ALERT_WINDOW).
 * The disclosure language mirrors
 * modules/cashback-guard/README.md: the app detects only WHICH partner app is
 * in the foreground, never screen content.
 *
 * Sections are numbered automatically from their array index (the screen
 * prepends "<n>. "), so inserting the usage-access section renumbers the rest
 * without hand-editing every title.
 */

export const PRIVACY_LAST_UPDATED = 'Last updated: 1 January 2026';

export interface PrivacySection {
  /** Section title WITHOUT the leading number — the screen adds "1. " etc. */
  heading: string;
  /** Body paragraph. Use '\n' for hard line breaks (e.g. Contact Us). */
  body: string;
}

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    heading: 'Introduction',
    body: 'Cards.xtra ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, share, and protect your personal information when you use our mobile app, website, or services.',
  },
  {
    heading: 'Information We Collect',
    body: 'We collect information you provide directly to us, such as your name, email address, phone number, date of birth, and payment details. We also automatically collect device information, IP addresses, app usage data, and browsing activity through cookies and similar technologies.',
  },
  {
    // Added for Play Store compliance — see file header.
    heading: 'Device Permissions & Usage Access',
    body: 'To power the optional Cashback Reminder feature on Android, Cards.xtra requests Usage Access (the "PACKAGE_USAGE_STATS" permission) and permission to show notifications. When you enable this feature, the app detects only which shopping app (for example Amazon, Flipkart, or AJIO) is currently in the foreground, so it can send a one-tap reminder notification to activate your cashback. We never read screen content, keystrokes, or any data inside other apps, and this detection runs only while your screen is on and unlocked. This feature is entirely optional — the app works without it, and you can grant or revoke these permissions at any time from your device Settings.',
  },
  {
    heading: 'How We Use Your Information',
    body: 'We use your information to: (a) provide and improve our services, (b) process Cashback and Rewards, (c) communicate with you about offers and updates, (d) prevent fraud and ensure security, (e) comply with legal obligations, and (f) personalize your experience.',
  },
  {
    heading: 'Sharing of Information',
    body: 'We share your information with: (a) retailers and partner merchants to track your purchases for Cashback, (b) payment service providers to process withdrawals, (c) analytics and marketing partners, and (d) law enforcement when required by law. We do not sell your personal information.',
  },
  {
    heading: 'Data Retention',
    body: 'We retain your personal information for as long as your account is active or as needed to provide services. We may retain certain information for up to 7 years to comply with tax and legal obligations.',
  },
  {
    heading: 'Your Rights',
    body: 'You have the right to: access your data, correct inaccuracies, delete your account, opt out of marketing communications, and request a copy of your data. To exercise these rights, contact support@cardxtra.com.',
  },
  {
    heading: 'Security',
    body: 'We implement industry-standard security measures including encryption, secure servers, and access controls to protect your data. However, no system is completely secure — please use strong passwords and notify us of any suspicious activity.',
  },
  {
    heading: 'Cookies',
    body: 'We use cookies and similar tracking technologies to enable Cashback tracking, remember your preferences, analyze traffic, and personalize content. You can control cookies through your browser settings, but disabling them may affect tracking.',
  },
  {
    heading: 'Third-Party Links',
    body: 'Our app may contain links to third-party retailers. We are not responsible for the privacy practices of these external sites. Please review their privacy policies before sharing information.',
  },
  {
    heading: "Children's Privacy",
    body: 'Cards.xtra is not intended for users under 18 years of age. We do not knowingly collect information from children. If you believe a child has provided us with information, please contact us immediately.',
  },
  {
    heading: 'Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. Significant changes will be notified via the app or email. Continued use of the service after changes means you accept the updated policy.',
  },
  {
    heading: 'Contact Us',
    body: 'For questions about this Privacy Policy or your data, contact us at:\nEmail: support@cardxtra.com\nAddress: Pouring Pounds, Gurgaon, India',
  },
];
