import { afterEach, describe, expect, test, vi } from "vitest";

import { sendEmail } from "@/lib/email";

// Never let a real send escape, even if a key leaks in from .env.test.
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: "stub" }) },
  })),
}));

afterEach(() => vi.unstubAllEnvs());

const opts = { to: "child@example.com", subject: "hi", html: "<p>hi</p>" };

describe("sendEmail production guard", () => {
  test("throws in production when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PLAYWRIGHT_TEST", "");
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(sendEmail(opts)).rejects.toThrow(
      /RESEND_API_KEY is not set in production/,
    );
  });

  test("under Playwright e2e, a missing key warns and skips instead of throwing", async () => {
    // The e2e suite runs a production build but delivers magic links via a file
    // sink, so the real Resend send must not be required (and must not fire).
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PLAYWRIGHT_TEST", "1");
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(sendEmail(opts)).resolves.toBeUndefined();
  });
});
