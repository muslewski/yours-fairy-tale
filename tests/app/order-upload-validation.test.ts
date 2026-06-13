import { describe, expect, test } from "vitest";

import {
  isServerAcceptedImage,
  validateUploadFile,
} from "@/lib/order-upload-validation";

describe("isServerAcceptedImage", () => {
  test("accepts jpeg/png/webp; rejects heic and non-images", () => {
    expect(isServerAcceptedImage("image/jpeg")).toBe(true);
    expect(isServerAcceptedImage("image/png")).toBe(true);
    expect(isServerAcceptedImage("image/webp")).toBe(true);
    expect(isServerAcceptedImage("image/heic")).toBe(false);
    expect(isServerAcceptedImage("image/heif")).toBe(false);
    expect(isServerAcceptedImage("application/pdf")).toBe(false);
    expect(isServerAcceptedImage("")).toBe(false);
  });
});

describe("validateUploadFile still accepts HEIC at the client picker (converted later)", () => {
  test("HEIC passes picker validation", () => {
    expect(validateUploadFile({ type: "image/heic", size: 1000, name: "a.heic" }).ok).toBe(true);
  });
});
