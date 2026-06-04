# Contact Page (`/contact`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public `/contact` page with a functional Resend-backed contact form, direct channels, support highlights, a contact-oriented mini-FAQ, and a "Place an order" CTA to the homepage wizard.

**Architecture:** A new `app/contact/` route (own `layout.tsx` mirroring `/series`, server-component `page.tsx`) renders static content plus a `"use client"` `<ContactForm/>` island. The form POSTs JSON to `app/api/contact/route.ts`, which validates and sends via the existing `lib/email.ts` Resend helper. All validation + email construction lives in a pure, tested `lib/contact.ts`.

**Tech Stack:** Next.js 16 App Router (server + client components), React 19, Tailwind v4 brand tokens, Resend (existing `sendEmail`), vitest (unit/integration), Playwright (E2E Layer A).

**Spec:** `fairy-tale-mind/specs/2026-06-04-contact-page-design.md`

---

### Task 1: `lib/contact.ts` — validation + email template + send (pure, tested)

**Files:**
- Create: `lib/contact.ts`
- Test: `tests/contact/contact.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/contact/contact.test.ts
import { expect, test, vi, beforeEach } from "vitest";
import {
  validateContactInput,
  buildContactEmail,
  submitContactMessage,
  CONTACT_TOPICS,
} from "@/lib/contact";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
import { sendEmail } from "@/lib/email";

beforeEach(() => vi.clearAllMocks());

const valid = {
  name: "Ada Parent",
  email: "ada@example.com",
  topic: "Order help",
  message: "When will my order be ready?",
};

test("accepts a valid input and trims strings", () => {
  const r = validateContactInput({ ...valid, name: "  Ada Parent  " });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.name).toBe("Ada Parent");
});

test("rejects empty name, bad email, empty message", () => {
  expect(validateContactInput({ ...valid, name: "" }).ok).toBe(false);
  expect(validateContactInput({ ...valid, email: "not-an-email" }).ok).toBe(false);
  expect(validateContactInput({ ...valid, message: "   " }).ok).toBe(false);
});

test("rejects when the honeypot is filled (spam)", () => {
  expect(validateContactInput({ ...valid, company: "spam-bot" }).ok).toBe(false);
});

test("defaults an unknown/missing topic to 'Something else'", () => {
  const r = validateContactInput({ ...valid, topic: "weird" });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.topic).toBe("Something else");
  expect(CONTACT_TOPICS).toContain("Something else");
});

test("caps overly long name/message", () => {
  expect(validateContactInput({ ...valid, name: "x".repeat(200) }).ok).toBe(false);
  expect(validateContactInput({ ...valid, message: "x".repeat(6000) }).ok).toBe(false);
});

test("buildContactEmail contains the submitted fields", () => {
  const html = buildContactEmail({ ...valid });
  expect(html).toContain("Ada Parent");
  expect(html).toContain("ada@example.com");
  expect(html).toContain("Order help");
  expect(html).toContain("When will my order be ready?");
});

test("submitContactMessage sends to the inbox on valid input", async () => {
  const r = await submitContactMessage({ ...valid });
  expect(r.ok).toBe(true);
  expect(sendEmail).toHaveBeenCalledTimes(1);
  const arg = (sendEmail as unknown as { mock: { calls: any[][] } }).mock.calls[0][0];
  expect(arg.to).toBe("hello@yoursfairytale.com");
  expect(arg.subject).toContain("Order help");
});

test("submitContactMessage does not send on invalid input", async () => {
  const r = await submitContactMessage({ ...valid, email: "bad" });
  expect(r.ok).toBe(false);
  expect(sendEmail).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/contact/contact.test.ts`
Expected: FAIL — `Cannot find module '@/lib/contact'`.

- [ ] **Step 3: Implement `lib/contact.ts`**

```ts
// lib/contact.ts
/**
 * Contact form domain logic — pure validation + email construction + send.
 *
 * The /contact form POSTs here via app/api/contact/route.ts. We keep all rules
 * and the email template in this module so they are unit-testable without HTTP.
 *
 * Anti-spam: a hidden honeypot field `company` must stay empty. Real users
 * never see it; bots that fill every field trip it and are rejected.
 */
import { escapeHtml } from "@/lib/utils";
import { sendEmail } from "@/lib/email";

export const CONTACT_TOPICS = [
  "Order help",
  "Changes & revisions",
  "Delivery",
  "Gifting",
  "Something else",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export interface ContactInput {
  name?: string;
  email?: string;
  topic?: string;
  message?: string;
  /** Honeypot — must be empty. */
  company?: string;
}

export interface ContactValue {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
}

export type ValidationResult =
  | { ok: true; value: ContactValue }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 100;
const MAX_MESSAGE = 5000;

export function validateContactInput(input: ContactInput): ValidationResult {
  // Honeypot: any value here means a bot filled the hidden field.
  if (input.company && input.company.trim() !== "") {
    return { ok: false, error: "Your message could not be sent." };
  }

  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim();
  const message = (input.message ?? "").trim();

  if (!name) return { ok: false, error: "Please add your name." };
  if (name.length > MAX_NAME) return { ok: false, error: "That name is too long." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please add a valid email address." };
  if (!message) return { ok: false, error: "Please add a message." };
  if (message.length > MAX_MESSAGE) return { ok: false, error: "That message is too long." };

  const topic = (CONTACT_TOPICS as readonly string[]).includes(input.topic ?? "")
    ? (input.topic as ContactTopic)
    : "Something else";

  return { ok: true, value: { name, email, topic, message } };
}

export function buildContactEmail(value: ContactValue): string {
  const safeName = escapeHtml(value.name);
  const safeEmail = escapeHtml(value.email);
  const safeTopic = escapeHtml(value.topic);
  const safeMessage = escapeHtml(value.message).replace(/\n/g, "<br />");

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New contact message</title></head>
<body style="font-family: sans-serif; color: #1a1033; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
  <h1 style="font-size: 20px; margin-bottom: 8px;">New contact message</h1>
  <p style="margin: 4px 0;"><strong>Topic:</strong> ${safeTopic}</p>
  <p style="margin: 4px 0;"><strong>From:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
  <p style="white-space: pre-wrap; line-height: 1.5;">${safeMessage}</p>
  <p style="margin-top: 24px; font-size: 13px; color: #888;">
    Reply directly to ${safeEmail} to respond.
  </p>
</body>
</html>
  `.trim();
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitContactMessage(input: ContactInput): Promise<SubmitResult> {
  const result = validateContactInput(input);
  if (!result.ok) return result;

  const inbox = process.env.CONTACT_INBOX ?? "hello@yoursfairytale.com";
  await sendEmail({
    to: inbox,
    subject: `New contact message — ${result.value.topic}`,
    html: buildContactEmail(result.value),
  });
  return { ok: true };
}
```

- [ ] **Step 4: Ensure `escapeHtml` exists in `lib/utils.ts`**

Check: `grep -n "escapeHtml" lib/utils.ts`. If it is **missing**, add this export to `lib/utils.ts`:

```ts
/** Escape the 5 HTML-significant characters for safe interpolation into email HTML. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/contact/contact.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/contact.ts tests/contact/contact.test.ts lib/utils.ts
git commit -m "feat(contact): validation + email template + send in lib/contact.ts"
```

---

### Task 2: `app/api/contact/route.ts` — public POST endpoint

**Files:**
- Create: `app/api/contact/route.ts`
- Test: `tests/contact/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/contact/route.test.ts
import { expect, test, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
import { sendEmail } from "@/lib/email";
import { POST } from "@/app/api/contact/route";

beforeEach(() => vi.clearAllMocks());

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const valid = {
  name: "Ada Parent",
  email: "ada@example.com",
  topic: "Order help",
  message: "Hello there.",
};

test("valid body → 200 and sends the email", async () => {
  const res = await POST(req(valid));
  expect(res.status).toBe(200);
  await expect(res.json()).resolves.toEqual({ ok: true });
  expect(sendEmail).toHaveBeenCalledTimes(1);
});

test("invalid body → 400 and does not send", async () => {
  const res = await POST(req({ ...valid, email: "bad" }));
  expect(res.status).toBe(400);
  expect(sendEmail).not.toHaveBeenCalled();
});

test("filled honeypot → 400 and does not send", async () => {
  const res = await POST(req({ ...valid, company: "bot" }));
  expect(res.status).toBe(400);
  expect(sendEmail).not.toHaveBeenCalled();
});

test("malformed JSON → 400", async () => {
  const bad = new NextRequest("http://localhost/api/contact", {
    method: "POST",
    body: "{not json",
    headers: { "content-type": "application/json" },
  });
  const res = await POST(bad);
  expect(res.status).toBe(400);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/contact/route.test.ts`
Expected: FAIL — cannot import `POST` from a non-existent route.

- [ ] **Step 3: Implement the route**

```ts
// app/api/contact/route.ts
/**
 * POST /api/contact — public contact-form endpoint.
 *
 * Validates and sends the message via lib/contact.ts (which uses the shared
 * Resend helper). Public: no auth. Bad input → 400; unexpected send error → 500.
 */
import { NextRequest, NextResponse } from "next/server";

import { submitContactMessage, type ContactInput } from "@/lib/contact";

export async function POST(req: NextRequest) {
  let body: ContactInput;
  try {
    body = (await req.json()) as ContactInput;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await submitContactMessage(body);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] send failed:", err);
    return NextResponse.json(
      { ok: false, error: "We couldn't send your message. Please try again." },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/contact/route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/contact/route.ts tests/contact/route.test.ts
git commit -m "feat(contact): POST /api/contact endpoint"
```

---

### Task 3: `<ContactForm/>` client island

**Files:**
- Create: `components/contact/contact-form.tsx`

No new unit test (interaction is covered by the E2E in Task 5). Verify it typechecks and renders.

- [ ] **Step 1: Implement the form island**

```tsx
// components/contact/contact-form.tsx
"use client";

import { useState, type FormEvent } from "react";

import { CONTACT_TOPICS } from "@/lib/contact";

type Status = "idle" | "loading" | "sent" | "error";

const FIELD =
  "w-full rounded-xl border-2 border-brand-deep bg-white px-4 py-3 text-brand-deep placeholder:text-brand-deep/30 focus:outline-none focus:ring-2 focus:ring-brand-yellow";
const LABEL = "block text-sm font-medium text-brand-deep mb-1";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<string>(CONTACT_TOPICS[0]);
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, topic, message, company }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setErrorMessage(
          data.error ?? "We couldn't send your message. Please try again in a moment.",
        );
      }
    } catch {
      setStatus("error");
      setErrorMessage("We couldn't reach our server. Please try again in a moment.");
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded-2xl border-2 border-brand-deep bg-white p-6 shadow-comic"
      >
        <h3 className="mb-2 text-xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          Thanks — we've got your message
        </h3>
        <p className="text-brand-deep/70" style={{ fontFamily: "var(--font-quicksand)" }}>
          A real person will read it and reply to{" "}
          <strong className="text-brand-deep">{email}</strong>, usually within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ fontFamily: "var(--font-quicksand)" }}>
      {/* Honeypot — hidden from real users, catches bots. */}
      <div aria-hidden className="absolute left-[-9999px]" style={{ position: "absolute" }}>
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="contact-name" className={LABEL}>Your name</label>
        <input id="contact-name" type="text" required autoComplete="name"
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe" className={FIELD} />
      </div>

      <div className="mb-4">
        <label htmlFor="contact-email" className={LABEL}>Email address</label>
        <input id="contact-email" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" className={FIELD} />
      </div>

      <div className="mb-4">
        <label htmlFor="contact-topic" className={LABEL}>What's this about?</label>
        <select id="contact-topic" value={topic} onChange={(e) => setTopic(e.target.value)}
          className={FIELD}>
          {CONTACT_TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="contact-message" className={LABEL}>Message</label>
        <textarea id="contact-message" required rows={5}
          value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us how we can help…"
          className={`${FIELD} resize-y`} />
      </div>

      {status === "error" && (
        <p role="alert" className="mb-4 text-sm text-rose-700">{errorMessage}</p>
      )}

      <button type="submit" disabled={status === "loading" || !name || !email || !message}
        className="w-full rounded-xl border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-semibold text-brand-deep shadow-comic transition-opacity disabled:opacity-50">
        {status === "loading" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to these files.

- [ ] **Step 3: Commit**

```bash
git add components/contact/contact-form.tsx
git commit -m "feat(contact): ContactForm client island"
```

---

### Task 4: `/contact` route — layout + page content

**Files:**
- Create: `app/contact/layout.tsx`
- Create: `app/contact/page.tsx`

- [ ] **Step 1: Create the layout** (mirrors `app/series/layout.tsx`)

```tsx
// app/contact/layout.tsx
import { SiteNav } from "@/components/home/site-nav";
import { SiteFooter } from "@/components/home/site-footer";

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-brand-cream pb-24 pt-28 font-[family-name:var(--font-quicksand)] text-brand-deep sm:pt-32">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 2: Create the page** (server component; copy per brand-voice)

```tsx
// app/contact/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact — Yours Fairy Tale",
  description:
    "Questions about an order, a change, or a gift? Reach a real person at Yours Fairy Tale. We read every message and reply, usually within one business day.",
};

const HIGHLIGHTS = [
  { title: "Order help", body: "Questions before or after you order — we'll walk you through it." },
  { title: "Changes & revisions", body: "Need to tweak a name, a photo, or a scene? Just ask." },
  { title: "Delivery & formats", body: "When it's ready, how you'll watch it, and where to find it." },
  { title: "Gifting", body: "Ordering for someone else? We'll help you make it feel special." },
];

const FAQS = [
  {
    q: "How soon will I hear back?",
    a: "We read every message ourselves and reply within one business day, often sooner.",
  },
  {
    q: "Can I change my order after placing it?",
    a: "Yes. Tell us what you'd like to change and we'll update it before your video goes into animation.",
  },
  {
    q: "How do refunds work?",
    a: "If something isn't right, write to us — we'll make it right or arrange a refund.",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10">
      {/* ── Intro ─────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl">
        <p className="text-sm font-black uppercase tracking-widest text-brand-pink">
          We're here to help
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-fredoka)] text-4xl font-bold leading-[1.0] sm:text-5xl">
          Talk to a real person
        </h1>
        <p className="mt-4 text-lg font-medium text-brand-deep/75">
          Questions about an order, a change you'd like, or a gift you're planning — write to us.
          We read every message ourselves and reply, usually within one business day.
        </p>
      </section>

      {/* ── Split card: form + direct channels ────────────────────────────── */}
      <section className="mt-12">
        <div className="grid overflow-hidden rounded-[28px] border-[3px] border-brand-deep shadow-comic-lg lg:grid-cols-[1.4fr_1fr]">
          <div className="bg-brand-cream p-8 sm:p-10">
            <h2 className="text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              Send us a message
            </h2>
            <p className="mb-7 mt-2 text-brand-deep/70">
              Tell us what's on your mind and we'll get right back to you.
            </p>
            <ContactForm />
          </div>

          <div
            className="relative flex flex-col justify-between gap-8 bg-brand-deep p-8 text-white sm:p-10 lg:border-l-[3px] lg:border-brand-deep"
            style={{
              backgroundImage:
                "radial-gradient(circle at 10px 10px, rgba(255,249,238,0.10) 2px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          >
            <div className="relative z-10">
              <h2 className="text-xl" style={{ fontFamily: "var(--font-fredoka)" }}>
                Prefer email?
              </h2>
              <a
                href="mailto:hello@yoursfairytale.com"
                className="mt-3 inline-block text-lg font-bold text-brand-yellow underline-offset-4 hover:underline"
              >
                hello@yoursfairytale.com
              </a>
              <p className="mt-3 text-sm text-white/70">
                We reply within one business day.
              </p>
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                Find us
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Instagram", "TikTok", "Pinterest"].map((s) => (
                  <span
                    key={s}
                    className="rounded-lg border-2 border-white/30 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white/70"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Support highlights ────────────────────────────────────────────── */}
      <section className="mt-20">
        <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold sm:text-3xl">
          What we can help with
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((h) => (
            <div
              key={h.title}
              className="rounded-2xl border-[3px] border-brand-deep bg-white p-5 shadow-comic-sm"
            >
              <h3 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
                {h.title}
              </h3>
              <p className="mt-2 text-sm text-brand-deep/70">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mini-FAQ ──────────────────────────────────────────────────────── */}
      <section className="mt-20">
        <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold sm:text-3xl">
          Quick answers
        </h2>
        <dl className="mt-6 space-y-4">
          {FAQS.map((f) => (
            <div
              key={f.q}
              className="rounded-2xl border-[3px] border-brand-deep bg-white p-6 shadow-comic-sm"
            >
              <dt className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
                {f.q}
              </dt>
              <dd className="mt-2 text-brand-deep/70">{f.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-brand-deep/70">
          Looking for more?{" "}
          <Link href="/#faq" className="font-bold text-brand-deep underline underline-offset-4">
            Read the full FAQ
          </Link>
          .
        </p>
      </section>

      {/* ── Place-an-order CTA band ───────────────────────────────────────── */}
      <section className="mt-20">
        <div className="rounded-[28px] border-[3px] border-brand-deep bg-brand-yellow p-8 shadow-comic-lg sm:p-12">
          <h2 className="max-w-2xl font-[family-name:var(--font-fredoka)] text-3xl font-bold leading-[1.0] sm:text-4xl">
            Ready to make their story?
          </h2>
          <p className="mt-4 max-w-xl text-base font-medium text-brand-deep/75">
            Pick a world, add a few details, and picture their video. No payment until you're ready.
          </p>
          <Link
            href="/#build"
            className="mt-7 inline-flex items-center gap-1 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
          >
            Place an order →
          </Link>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/contact/layout.tsx app/contact/page.tsx
git commit -m "feat(contact): /contact route — layout + page sections"
```

---

### Task 5: Footer wiring + E2E

**Files:**
- Modify: `components/home/site-footer.tsx` (the Support → "Contact us" link)
- Create: `e2e/contact.spec.ts`

- [ ] **Step 1: Point the footer "Contact us" link at `/contact`**

In `components/home/site-footer.tsx`, in the `COLUMNS` array under the `Support` section, change:

```ts
{ label: "Contact us", href: "/#top" },
```

to:

```ts
{ label: "Contact us", href: "/contact" },
```

- [ ] **Step 2: Write the E2E test** (Layer A — deterministic, API mocked)

```ts
// e2e/contact.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Contact page (Layer A)", () => {
  test("submits the form and shows the success state", async ({ page }) => {
    await page.route("**/api/contact", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }),
    );

    await page.goto("/contact");
    await page.getByLabel("Your name").fill("Ada Parent");
    await page.getByLabel("Email address").fill("ada@example.com");
    await page.getByLabel("Message").fill("When will my order be ready?");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("Thanks — we've got your message")).toBeVisible();
  });

  test("footer 'Contact us' link points at /contact", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: "Contact us" });
    await expect(link).toHaveAttribute("href", "/contact");
  });
});
```

- [ ] **Step 3: Run the E2E (best-effort; matches existing Layer A runner)**

Run: `npx playwright test e2e/contact.spec.ts` (or the project's configured command, e.g. `npm run test:e2e -- contact`).
Expected: PASS. If the local Playwright/browser environment is unavailable, note it and rely on Task 6's manual browser verification instead.

- [ ] **Step 4: Commit**

```bash
git add components/home/site-footer.tsx e2e/contact.spec.ts
git commit -m "feat(contact): wire footer link + Layer-A E2E"
```

---

### Task 6: Verification + Mind maintenance

**Files:**
- Create: `fairy-tale-mind/map/zones/contact.md`
- Create: `fairy-tale-mind/map/decisions/contact-page.md`
- Modify: `fairy-tale-mind/map/zones/app-shell.md` (footer-link change → re-stamp `verifiedAt`)
- Regenerate: `fairy-tale-mind/map/index.md` (via `npm run mind`)

- [ ] **Step 1: Run the full unit/integration suite**

Run: `npx vitest run tests/contact`
Expected: PASS (12 tests across the two files).

- [ ] **Step 2: Manual browser verification** (REQUIRED SUB-SKILL: `verify`)

Start the app, open `/contact`. Confirm: page renders with nav + footer, the form submits to the success state (set `RESEND_TO_OVERRIDE` so a real email is safe, or rely on the route returning `{ ok: true }`), the mailto link and `/#faq` and `/#build` links resolve, and the footer "Contact us" link navigates to `/contact`. Capture a screenshot.

- [ ] **Step 3: Write the `contact` zone card**

```markdown
---
type: zone
summary: "The /contact page — functional Resend-backed contact form, channels, support highlights, mini-FAQ, and a Place-an-order CTA."
tags: [feature, marketing, support]
status: active
created: 2026-06-04
updated: 2026-06-04
related: ["[[app-shell]]", "[[checkout]]", "[[homepage]]"]
sources: ["[[2026-06-04-contact-page-design]]", "[[contact-page]]"]
owns:
  routes: ["/contact"]
  anchors: []
  globs:
    - "app/contact/**"
    - "components/contact/**"
    - "lib/contact.ts"
    - "app/api/contact/route.ts"
    - "tests/contact/**"
    - "e2e/contact.spec.ts"
depends: ["[[app-shell]]", "[[checkout]]"]
invariants:
  - rule: "The contact form is FUNCTIONAL — it POSTs to /api/contact and sends via lib/email.ts (Resend). A hidden honeypot field (company) must stay empty; validation lives in lib/contact.ts."
    enforcedBy: ["tests/contact/contact.test.ts", "tests/contact/route.test.ts"]
verifiedAt: <HEAD-after-merge>
---

## Purpose
The `/contact` surface where parents reach a real person. A server-component page
(`app/contact/page.tsx`) under a `/series`-style layout renders the static content;
a `"use client"` `<ContactForm/>` island POSTs JSON to `app/api/contact/route.ts`,
which validates + sends via the shared Resend helper (`[[checkout]]` owns `lib/email.ts`).
Recipient: `CONTACT_INBOX` env, default `hello@yoursfairytale.com`.

Sections: intro → split card (form + direct channels) → support highlights → contact
mini-FAQ (links to the homepage `/#faq`) → Place-an-order CTA (`/#build`).

## Lineage
Created 2026-06-04 (`[[2026-06-04-contact-page-design]]`). The footer's Support →
"Contact us" link, previously a dead `/#top`, now points here.
```

(Replace `<HEAD-after-merge>` with the merge commit SHA, or let `npm run mind` / a follow-up re-stamp handle it.)

- [ ] **Step 4: Write the decision record**

```markdown
---
type: decision
summary: "The /contact form is functional (Resend) while other marketing forms stay UI-only."
status: accepted
created: 2026-06-04
related: ["[[contact]]", "[[checkout]]"]
---

# Contact form is functional via Resend

## Context
The footer newsletter and the configurator photo dropzone are wired in the UI with
no live backend, because they need infrastructure we don't have yet (a mailing-list
provider, blob storage). The contact form is different: Resend is already wired
(`lib/email.ts`, used by checkout + status emails), so delivering a contact message
is low effort and high value.

## Decision
Make the contact form actually send. Validation + email construction live in a pure,
tested `lib/contact.ts`; the route is `POST /api/contact`. Spam defense is a hidden
honeypot field only (no CAPTCHA/rate-limiting yet — YAGNI). Messages are emailed to
`CONTACT_INBOX` (default `hello@yoursfairytale.com`), not persisted in Payload.

## Consequences
- A real inbox must exist for `CONTACT_INBOX`; until a domain is verified,
  `RESEND_TO_OVERRIDE` redirects all mail safely in dev.
- If spam becomes a problem, add rate-limiting/CAPTCHA later.
- If we later want a message history, add a Payload collection — deferred for now.
```

- [ ] **Step 5: Re-stamp `app-shell` and regenerate the index**

- In `fairy-tale-mind/map/zones/app-shell.md`, add a Lineage line noting the footer "Contact us" link now resolves to `/contact`, and update `verifiedAt` to the new HEAD.
- Run: `npm run mind`
- Commit:

```bash
git add fairy-tale-mind/
git commit -m "docs(mind): contact zone + decision; re-stamp app-shell"
```

- [ ] **Step 6: Finish the branch** (REQUIRED SUB-SKILL: `superpowers:finishing-a-development-branch`)

Verify the full suite, then present merge/PR options.

---

## Self-review notes

- **Spec coverage:** intro ✓, split card (form + channels) ✓, support highlights ✓, mini-FAQ ✓, CTA ✓, functional Resend backend ✓, honeypot ✓, footer wiring ✓, tests (unit/integration/E2E) ✓, Mind ✓. All spec sections map to a task.
- **Type consistency:** `CONTACT_TOPICS`, `ContactInput`, `ContactValue`, `submitContactMessage`, `validateContactInput`, `buildContactEmail` are used identically across `lib/contact.ts`, the route, the form island, and the tests.
- **Dependency note:** Task 1 Step 4 guards `escapeHtml` — add it only if missing from `lib/utils.ts`.
- **Env:** `CONTACT_INBOX` is optional (defaults to `hello@yoursfairytale.com`); no new required env. `RESEND_*` already configured.
