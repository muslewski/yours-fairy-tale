import { getPayload, type Payload } from "payload";

import config from "@payload-config";

// `getPayload` already memoizes internally, but we also cache the resolved
// instance here so callers don't re-await the init promise on every call.
let cached: Promise<Payload> | null = null;

/** Returns a memoized, ready-to-use Payload Local API instance. */
export function getPayloadClient(): Promise<Payload> {
  if (!cached) {
    cached = getPayload({ config });
  }
  return cached;
}
