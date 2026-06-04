import { expect, test, vi, beforeEach } from "vitest";
import {
  validateContactInput,
  buildContactEmail,
  submitContactMessage,
  CONTACT_TOPICS,
  type ContactValue,
} from "@/lib/contact";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
import { sendEmail } from "@/lib/email";

beforeEach(() => vi.clearAllMocks());

const valid: ContactValue = {
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
  expect(arg.replyTo).toBe("ada@example.com");
  expect(arg.subject).toContain("Order help");
});

test("submitContactMessage does not send on invalid input", async () => {
  const r = await submitContactMessage({ ...valid, email: "bad" });
  expect(r.ok).toBe(false);
  expect(sendEmail).not.toHaveBeenCalled();
});
