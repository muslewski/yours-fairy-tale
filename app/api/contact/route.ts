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
