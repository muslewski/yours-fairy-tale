import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

// Isolate the shared sendEmail mock so call-count assertions are order-independent.
beforeEach(() => {
  vi.clearAllMocks();
});

import { sendEmail } from "@/lib/email";
import { getPayloadClient } from "@/lib/payload";
import {
  validateWaitlistInput,
  buildWaitlistEmail,
  submitWaitlistSignup,
} from "@/lib/waitlist";

test("rejects a filled honeypot", () => {
  const r = validateWaitlistInput({ email: "a@b.co", company: "bot inc" });
  expect(r.ok).toBe(false);
});

test("rejects an invalid email", () => {
  expect(validateWaitlistInput({ email: "nope" }).ok).toBe(false);
  expect(validateWaitlistInput({}).ok).toBe(false);
});

test("rejects an over-long email", () => {
  const r = validateWaitlistInput({ email: `${"a".repeat(250)}@example.com` });
  expect(r.ok).toBe(false);
});

test("normalizes email to trimmed lowercase", () => {
  const r = validateWaitlistInput({ email: "  Ada@Example.COM " });
  expect(r).toEqual({ ok: true, email: "ada@example.com" });
});

test("thank-you email is branded and calm", () => {
  const html = buildWaitlistEmail();
  // renderBrandedEmail HTML-escapes the heading, so the apostrophe in
  // "You're on the list" renders as an entity (You&#39;re …). Assert the
  // apostrophe-free part of the heading so the check survives escaping.
  expect(html).toContain("on the list");
  expect(html).toContain("Create their video");
  expect(html).not.toMatch(/!{2,}|Pow!|Kapow!/);
});

test("submitWaitlistSignup records the provided source", async () => {
  const email = `footer-${Date.now()}@example.com`;
  const payload = await getPayloadClient();
  let rowId: string | null = null;
  try {
    const res = await submitWaitlistSignup({ email, source: "footer" });
    expect(res.ok).toBe(true);

    const found = await payload.find({
      collection: "waitlist",
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    });
    rowId = found.docs[0] ? String(found.docs[0].id) : null;
    expect(found.docs[0]?.source).toBe("footer");
  } finally {
    if (rowId) {
      await payload
        .delete({ collection: "waitlist", id: rowId, overrideAccess: true })
        .catch(() => {});
    }
  }
});

test("signup persists the row and sends one thank-you; duplicate is a quiet success", async () => {
  const email = `waitlist-${Date.now()}@example.com`;
  const payload = await getPayloadClient();
  let rowId: string | null = null;
  try {
    const first = await submitWaitlistSignup({ email });
    expect(first).toEqual({ ok: true });

    const rows = await payload.find({
      collection: "waitlist",
      where: { email: { equals: email } },
      overrideAccess: true,
    });
    expect(rows.totalDocs).toBe(1);
    rowId = String(rows.docs[0].id);
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const second = await submitWaitlistSignup({ email });
    expect(second).toEqual({ ok: true });
    const after = await payload.find({
      collection: "waitlist",
      where: { email: { equals: email } },
      overrideAccess: true,
    });
    expect(after.totalDocs).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1); // no second email
  } finally {
    if (rowId) {
      await payload
        .delete({ collection: "waitlist", id: rowId, overrideAccess: true })
        .catch(() => {});
    }
  }
});
