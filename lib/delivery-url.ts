/**
 * delivery-url — pure validation + display helpers for the studio's external
 * delivery links (orders.proofUrl / finalVideoUrl). https-only; the link is
 * pasted by trusted staff and shown to the customer, so we canonicalize + refuse
 * unsafe schemes here and never render a non-https value. No DB. Tested in
 * tests/lib/delivery-url.test.ts.
 */
export type NormalizedDeliveryUrl =
  | { ok: true; url: string; host: string }
  | { ok: false; error: string };

/** Validate + canonicalize a pasted external delivery link. https only. */
export function normalizeDeliveryUrl(input: string): NormalizedDeliveryUrl {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Paste a link first." };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "That does not look like a valid link." };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Links must start with https://" };
  }
  return { ok: true, url: parsed.href, host: parsed.host };
}

/** Host of a stored delivery URL, or null if it is not a safe https URL. */
export function deliveryUrlHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.host : null;
  } catch {
    return null;
  }
}

/** What a customer slot should render: the in-app upload, an external link, both, or nothing. */
export type DeliveryView =
  | { mode: "upload-with-link"; host: string }
  | { mode: "upload" }
  | { mode: "link-only"; host: string }
  | { mode: "none" };

export function deliveryView(
  hasUpload: boolean,
  url: string | null | undefined,
): DeliveryView {
  const host = deliveryUrlHost(url);
  if (hasUpload) return host ? { mode: "upload-with-link", host } : { mode: "upload" };
  return host ? { mode: "link-only", host } : { mode: "none" };
}
