/**
 * delivery-url — pure https validation + display helpers for the studio's
 * external delivery links (orders.proofUrl / finalVideoUrl). No DB.
 */
import { describe, expect, test } from "vitest";

import {
  normalizeDeliveryUrl,
  deliveryUrlHost,
  deliveryView,
} from "@/lib/delivery-url";

describe("normalizeDeliveryUrl", () => {
  test("accepts a well-formed https url, returning canonical href + host", () => {
    const r = normalizeDeliveryUrl("  https://drive.google.com/file/d/abc/view  ");
    expect(r).toEqual({
      ok: true,
      url: "https://drive.google.com/file/d/abc/view",
      host: "drive.google.com",
    });
  });
  test("rejects empty input", () => {
    expect(normalizeDeliveryUrl("   ")).toEqual({ ok: false, error: "Paste a link first." });
  });
  test("rejects non-https schemes", () => {
    for (const bad of ["http://x.com/a", "javascript:alert(1)", "data:text/html,x", "mailto:a@b.c"]) {
      expect(normalizeDeliveryUrl(bad).ok).toBe(false);
    }
  });
  test("rejects garbage that is not a url", () => {
    expect(normalizeDeliveryUrl("not a link").ok).toBe(false);
  });
});

describe("deliveryUrlHost", () => {
  test("returns the host for a valid https url", () => {
    expect(deliveryUrlHost("https://www.dropbox.com/s/x")).toBe("www.dropbox.com");
  });
  test("returns null for non-https / invalid / empty", () => {
    expect(deliveryUrlHost("http://x.com")).toBeNull();
    expect(deliveryUrlHost("nope")).toBeNull();
    expect(deliveryUrlHost(null)).toBeNull();
  });
});

describe("deliveryView", () => {
  const url = "https://drive.google.com/x";
  test("upload + link → upload-with-link", () => {
    expect(deliveryView(true, url)).toEqual({ mode: "upload-with-link", host: "drive.google.com" });
  });
  test("upload, no link → upload", () => {
    expect(deliveryView(true, null)).toEqual({ mode: "upload" });
  });
  test("no upload, link → link-only", () => {
    expect(deliveryView(false, url)).toEqual({ mode: "link-only", host: "drive.google.com" });
  });
  test("neither → none", () => {
    expect(deliveryView(false, null)).toEqual({ mode: "none" });
  });
  test("an unsafe stored url is treated as no link", () => {
    expect(deliveryView(false, "http://x.com")).toEqual({ mode: "none" });
    expect(deliveryView(true, "javascript:1")).toEqual({ mode: "upload" });
  });
});
