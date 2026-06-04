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
