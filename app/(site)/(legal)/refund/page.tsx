import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy — Yours Fairy Tale",
  description:
    "How refunds work at Yours Fairy Tale. Because each video is made to order, we share a preview and offer revisions, and we make it right if something is wrong.",
};

const sections: LegalSection[] = [
  {
    heading: "Our promise",
    body: [
      "We want you to love your child's video. Because each one is made to order with your child's name and photos, this policy explains when refunds apply and how we make things right.",
    ],
  },
  {
    heading: "We share a preview first",
    body: [
      "Before your video is finished, we send you a preview to review. This is the moment to ask for changes. We offer revisions so the video is right before it is finalized, which resolves most concerns without a refund.",
    ],
  },
  {
    heading: "Personalized products",
    body: [
      "Because your video is personalized and made to order, we generally cannot offer a refund for a change of mind once production has begun or after you have approved the final video. This is similar to other custom, made-to-order products.",
    ],
  },
  {
    heading: "If something is wrong",
    body: [
      "If your video is faulty, does not match what you ordered, or there is a genuine problem with it, write to us. We will fix it, or if we cannot, we will offer a refund. Your statutory rights as a consumer always apply.",
    ],
  },
  {
    heading: "If we cannot deliver",
    body: [
      "If we are unable to create or deliver your video, we will refund you in full.",
    ],
  },
  {
    heading: "How to request a refund",
    body: [
      "Write to us at hello@yoursfairytale.com with your order details and what went wrong. The sooner you reach out, the sooner we can help. We aim to reply within one business day.",
    ],
  },
  {
    heading: "How refunds are issued",
    body: [
      "Approved refunds are returned to your original payment method through Stripe. Depending on your bank or card provider, it can take a few business days for the refund to appear.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      lastUpdated="June 5, 2026"
      intro="Here is how refunds work, and how we make things right. Because each video is made to order, a preview and revisions come first, and we stand behind the result."
      sections={sections}
    />
  );
}
