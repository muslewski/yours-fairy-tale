/**
 * Daily cron: delete abandoned configurator/* blobs (uploaded in the configurator
 * but never checked out, so no media doc references them) older than a safety
 * window. Authorized via the Vercel cron Bearer (CRON_SECRET). Scope is limited
 * to the configurator/ prefix; studio/order blobs are out of scope here.
 * See fairy-tale-mind/tech-debt/orphaned-blobs-no-cleanup.md.
 */
import { NextRequest, NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";

const SAFETY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h — don't touch in-flight checkouts

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { list, del } = await import("@vercel/blob");
  const payload = await getPayloadClient();
  const cutoff = Date.now() - SAFETY_WINDOW_MS;

  let deleted = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "configurator/", cursor, limit: 200 });
    cursor = page.cursor;
    for (const blob of page.blobs) {
      if (blob.uploadedAt.getTime() > cutoff) continue;
      const ref = await payload.find({
        collection: "media",
        where: { filename: { equals: blob.pathname } },
        limit: 1,
        overrideAccess: true,
      });
      if (ref.totalDocs > 0) continue; // referenced by an order — keep
      await del(blob.url);
      deleted += 1;
    }
  } while (cursor);

  return NextResponse.json({ deleted });
}
