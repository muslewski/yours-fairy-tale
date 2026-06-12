import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — Yours Fairy Tale",
  description:
    "The terms for using Yours Fairy Tale: how orders and payment work, the content you provide, revisions, and our responsibilities to each other.",
};

const sections: LegalSection[] = [
  {
    heading: "Accepting these terms",
    body: [
      "These terms apply when you use Yours Fairy Tale and when you place an order. By using the site or ordering, you agree to them. If you do not agree, please do not use the service.",
    ],
  },
  {
    heading: "What we provide",
    body: [
      "Yours Fairy Tale creates a personalized animated video starring your child, based on the name, photos, and choices you provide. We use professional editing tools and AI to produce a polished, cinematic result.",
    ],
  },
  {
    heading: "Your account",
    body: [
      "You sign in with a magic link sent to your email, so there is no password to remember. Keep access to your email secure, since anyone with it can sign in to your account. Tell us right away if you think someone else has access.",
    ],
  },
  {
    heading: "Orders and payment",
    body: [
      "Prices are shown before you order. Payment is handled securely by Stripe, and your order begins after payment is confirmed. We may decline or cancel an order if we cannot fulfill it, in which case we will refund you.",
    ],
  },
  {
    heading: "The content you provide",
    body: [
      "You confirm that you are the child's parent or guardian, or that you have permission to use the name and photos you upload, and that doing so does not break any law or anyone else's rights.",
      "You keep all rights to your own photos. You grant us a limited license to use them only to create, produce, and deliver your video, and to keep a copy as part of your order records. We do not use your photos to advertise without your separate permission.",
    ],
  },
  {
    heading: "Proofs and revisions",
    body: [
      "Because each video is made to order, we share a preview so you can check it before it is finished. You can ask for revisions to get it right. Once you approve the video, we treat the order as complete.",
    ],
  },
  {
    heading: "Our intellectual property",
    body: [
      "The Yours Fairy Tale name, site, story templates, characters, art styles, and underlying technology belong to us. Your order gives you the finished video for personal, non-commercial enjoyment. It does not transfer ownership of our templates or technology to you.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "Please do not upload content that is unlawful, infringing, or harmful, or that you do not have the right to use. We may decline or stop work on any order that breaks these terms.",
    ],
  },
  {
    heading: "Disclaimers and liability",
    body: [
      "We work hard to deliver a result you will love, but the service is provided as is. To the extent the law allows, our total liability for any claim relating to the service is limited to the amount you paid for the order in question. Nothing in these terms limits rights that cannot be limited under the law that applies to you.",
    ],
  },
  {
    heading: "Refunds",
    body: [
      "How refunds work is explained in our Refund Policy, which forms part of these terms.",
    ],
  },
  {
    heading: "Governing law",
    body: [
      "These terms are governed by the laws of [your governing jurisdiction], without regard to conflict-of-law rules.",
    ],
  },
  {
    heading: "Changes and contact",
    body: [
      "We may update these terms from time to time, and we will change the date at the top when we do. This service is operated by Yours Fairy Tale, [registered business name and address]. Questions are welcome using the details below.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="June 5, 2026"
      intro="These terms cover how Yours Fairy Tale works: ordering and payment, the content you provide, revisions, and what you can expect from us."
      sections={sections}
    />
  );
}
