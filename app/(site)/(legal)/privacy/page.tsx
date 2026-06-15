import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Yours Fairy Tale",
  description:
    "How Yours Fairy Tale collects, uses, and protects your information, including the photos and details you share to create your child's personalized video.",
};

const sections: LegalSection[] = [
  {
    heading: "The short version",
    body: [
      "We collect only what we need to create and deliver your child's video, keep your account working, and support you. We do not sell your information, and we treat the photos and details you share with care.",
    ],
  },
  {
    heading: "Information we collect",
    body: ["When you order and use Yours Fairy Tale, we collect:"],
    bullets: [
      "Account details: your email address, used for magic-link sign-in.",
      "Order details: the child's first name and the choices you make for the story, such as the world, length, and any notes you add.",
      "Photos you upload: the pictures you provide so we can give the hero your child's likeness.",
      "Payment information: handled by our payment processor, Stripe. We do not store full card numbers.",
      "Basic usage data: standard technical information such as device and browser type, used to keep the site secure and working.",
    ],
  },
  {
    heading: "How we use your information",
    body: ["We use the information above to:"],
    bullets: [
      "Create, produce, and deliver the video you ordered.",
      "Manage your account, orders, and the order's progress.",
      "Reply to your messages and provide support.",
      "Keep the service secure and improve how it works.",
      "Meet our legal and accounting obligations.",
    ],
  },
  {
    heading: "A note on children's information",
    body: [
      "Yours Fairy Tale is bought by a parent or guardian, not by a child. The child's first name and the photos you share are provided by you, and we use them only to create the video you ordered.",
      "We do not build advertising profiles of children, and we do not market to children. If you would like us to delete a child's photos or details, write to us and we will.",
    ],
  },
  {
    heading: "How we share information",
    body: [
      "We share information only with the service providers that help us run Yours Fairy Tale, and only as needed to provide the service:",
    ],
    bullets: [
      "Stripe, to process payments securely.",
      "Our email provider, to send order updates and magic-link sign-in messages.",
      "Our hosting and database providers, to run the site and store your order.",
    ],
  },
  {
    heading: "We do not sell your information",
    body: [
      "We do not sell or rent your personal information, and we do not share it for third-party advertising.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "We keep your account and order information for as long as your account is active and for a reasonable period afterward, so we can support you and meet legal and accounting requirements. You can ask us to delete your information at any time, and we will, except where we are required to keep certain records.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "Depending on where you live, you may have the right to access, correct, or delete the personal information we hold about you, and to object to or limit certain uses. To exercise any of these, write to us using the details below and we will help.",
    ],
  },
  {
    heading: "Cookies and sessions",
    body: [
      "We use essential cookies to keep you signed in and to keep the site secure. We do not use advertising or cross-site tracking cookies.",
    ],
  },
  {
    heading: "Security",
    body: [
      "We use reasonable technical and organizational measures to protect your information. No method of storage or transmission is perfectly secure, but we work to keep your data safe and to limit who can access it.",
    ],
  },
  {
    heading: "Who we are and changes to this policy",
    body: [
      "This service is provided by Yours Fairy Tale, operated by Firma Dominik Jaworski AI (NIP 5543048002, REGON 544985902), ul. Nad Stawem 4, 86-005 Białe Błota, Poland. We may update this policy from time to time, and we will change the date at the top when we do.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="June 5, 2026"
      intro="This policy explains what information we collect, how we use it, and the choices you have. It covers the photos and details you share to create your child's personalized video."
      sections={sections}
    />
  );
}
