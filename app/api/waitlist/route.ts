/**
 * POST /api/waitlist — public Series waitlist endpoint.
 * Mirrors /api/contact: bad input → 400; unexpected failure → 500.
 */
import { NextRequest, NextResponse } from "next/server";

import { submitWaitlistSignup, type WaitlistInput } from "@/lib/waitlist";

export async function POST(req: NextRequest) {
  let body: WaitlistInput;
  try {
    body = (await req.json()) as WaitlistInput;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await submitWaitlistSignup(body);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[waitlist] signup failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "We couldn't add you to the list just now. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}
