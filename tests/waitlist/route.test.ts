import { expect, test, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/waitlist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/waitlist")>();
  return { ...actual, submitWaitlistSignup: vi.fn() };
});
import { submitWaitlistSignup } from "@/lib/waitlist";
import { POST } from "@/app/api/waitlist/route";

const mockSubmit = vi.mocked(submitWaitlistSignup);
beforeEach(() => vi.clearAllMocks());

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/waitlist", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

test("ok result → 200", async () => {
  mockSubmit.mockResolvedValue({ ok: true });
  const res = await POST(req({ email: "ada@example.com" }));
  expect(res.status).toBe(200);
  await expect(res.json()).resolves.toEqual({ ok: true });
});

test("validation failure → 400", async () => {
  mockSubmit.mockResolvedValue({ ok: false, error: "Please add a valid email address." });
  const res = await POST(req({ email: "nope" }));
  expect(res.status).toBe(400);
});

test("thrown error → 500 with gentle copy", async () => {
  mockSubmit.mockRejectedValue(new Error("db down"));
  const res = await POST(req({ email: "ada@example.com" }));
  expect(res.status).toBe(500);
  const body = await res.json();
  expect(body.error).toMatch(/try again in a moment/);
});

test("malformed JSON → 400 without calling submit", async () => {
  const bad = new NextRequest("http://localhost/api/waitlist", {
    method: "POST",
    body: "{not json",
    headers: { "content-type": "application/json" },
  });
  const res = await POST(bad);
  expect(res.status).toBe(400);
  expect(mockSubmit).not.toHaveBeenCalled();
});
