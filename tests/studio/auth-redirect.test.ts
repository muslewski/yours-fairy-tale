/**
 * studioUserOrRedirect — a not-authed studio MUTATION must bounce to
 * /studio/sign-in (the same graceful handling the (gated) layout gives page
 * GETs), NEVER throw a raw Error that Next surfaces as a 500.
 *
 * Regression for the "/studio/orders/[id] → Share the proof" 500: when the
 * admin session had expired, the action's requireStudioUser() threw outside the
 * try/catch, so the studio staff saw "Something went wrong on our end" instead
 * of being sent to sign in.
 */
import { describe, expect, test, vi, beforeEach } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { studioUserOrRedirect } from "@/lib/studio-auth";

describe("studioUserOrRedirect", () => {
  beforeEach(() => redirectMock.mockReset());

  test("no studio user → redirects to /studio/sign-in (not a thrown 500)", () => {
    studioUserOrRedirect(null);
    expect(redirectMock).toHaveBeenCalledWith("/studio/sign-in");
  });

  test("a signed-in staff user passes through unchanged, no redirect", () => {
    const user = { id: "admin-1", email: "staff@example.com", name: "Staff" };
    expect(studioUserOrRedirect(user)).toEqual(user);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
