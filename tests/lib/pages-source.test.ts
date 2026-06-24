import { describe, it, expect, vi, beforeEach } from "vitest";

// Make unstable_cache a pass-through so the resolver logic is tested directly.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/payload", () => ({
  getPayloadClient: vi.fn(),
}));

import { getPayloadClient } from "@/lib/payload";
import { getPageBySlug, getPublishedPageSlugs } from "@/lib/pages-source";

const mockClient = getPayloadClient as unknown as ReturnType<typeof vi.fn>;

function withFind(impl: (args: unknown) => unknown) {
  mockClient.mockResolvedValue({ find: vi.fn().mockImplementation(impl) });
}

beforeEach(() => mockClient.mockReset());

describe("getPageBySlug", () => {
  it("returns the doc when found", async () => {
    withFind(() => ({ docs: [{ slug: "about", title: "About" }] }));
    await expect(getPageBySlug("about")).resolves.toMatchObject({ slug: "about" });
  });
  it("returns null when absent", async () => {
    withFind(() => ({ docs: [] }));
    await expect(getPageBySlug("nope")).resolves.toBeNull();
  });
  it("returns null (never throws) on a read error", async () => {
    mockClient.mockResolvedValue({
      find: vi.fn().mockRejectedValue(new Error("db down")),
    });
    await expect(getPageBySlug("about", { draft: true })).resolves.toBeNull();
  });
  it("draft read filters by slug only (no published filter)", async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ slug: "draft-pg" }] });
    mockClient.mockResolvedValue({ find });
    await getPageBySlug("draft-pg", { draft: true });
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ draft: true, where: { slug: { equals: "draft-pg" } } }),
    );
  });
});

describe("getPublishedPageSlugs", () => {
  it("maps docs to non-empty slugs", async () => {
    withFind(() => ({ docs: [{ slug: "a" }, { slug: "" }, { slug: "b" }] }));
    await expect(getPublishedPageSlugs()).resolves.toEqual(["a", "b"]);
  });
  it("returns [] on error", async () => {
    mockClient.mockResolvedValue({
      find: vi.fn().mockRejectedValue(new Error("x")),
    });
    await expect(getPublishedPageSlugs()).resolves.toEqual([]);
  });
});
