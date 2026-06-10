import { expect, test, vi } from "vitest";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

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
  expect(html).toContain("You're on the list");
  expect(html).toContain("Create their video");
  expect(html).not.toMatch(/!{2,}|Pow!|Kapow!/);
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
