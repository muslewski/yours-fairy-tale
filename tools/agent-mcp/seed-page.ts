// Dev/verification seed: one published CMS Page exercising all four blocks +
// the plugin-seo meta group. Runs ONLY against the Neon test branch (bootstrap
// loads .env.test and the guard refuses anything else). Blob is disabled here
// (no token in .env.test), so the site-media upload lands on local disk.
//
//   vite-node --config tools/agent-mcp/vite.config.ts tools/agent-mcp/seed-page.ts
//
// Idempotent: re-running replaces the `about` page and reuses the seed asset.
import "./bootstrap-env";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPayloadClient } from "@/lib/payload";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

/** Minimal-but-valid lexical editor state the RichText converter accepts. */
const lexical = (paragraphs: string[]) => ({
  root: {
    type: "root",
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr" as const,
    children: paragraphs.map((text) => ({
      type: "paragraph",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr" as const,
      textFormat: 0,
      children: [
        { type: "text", format: 0, style: "", mode: "normal", detail: 0, text, version: 1 },
      ],
    })),
  },
});

async function main() {
  const payload = await getPayloadClient();

  // 1) Admin user (for /admin + in-process republish during revalidation test).
  const adminEmail = "agent@test.local";
  const adminPassword = "Test12345!";
  const existingAdmin = await payload.find({
    collection: "admins",
    where: { email: { equals: adminEmail } },
    limit: 1,
    overrideAccess: true,
  });
  if (existingAdmin.docs.length === 0) {
    await payload.create({
      collection: "admins",
      data: { email: adminEmail, password: adminPassword, name: "Agent Harness" },
      overrideAccess: true,
    });
    console.log(`admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`admin exists: ${adminEmail}`);
  }

  // 2) Site-media upload (reused for the Media block AND the og:image).
  const seedAlt = "Seed: child astronaut hero art";
  const existingMedia = await payload.find({
    collection: "site-media",
    where: { alt: { equals: seedAlt } },
    limit: 1,
    overrideAccess: true,
  });
  let mediaId = existingMedia.docs[0]?.id as string | undefined;
  if (!mediaId) {
    const created = await payload.create({
      collection: "site-media",
      data: { alt: seedAlt, caption: "A small dreamer among the stars." },
      filePath: path.join(repoRoot, "public/astronaut.png"),
      overrideAccess: true,
    });
    mediaId = created.id as string;
    console.log(`site-media created: ${mediaId} url=${(created as { url?: string }).url}`);
  } else {
    console.log(`site-media exists: ${mediaId}`);
  }

  // 3) Replace any prior `about` page so the seed is deterministic.
  const prior = await payload.find({
    collection: "pages",
    where: { slug: { equals: "about" } },
    limit: 1,
    overrideAccess: true,
    draft: true,
  });
  if (prior.docs[0]) {
    await payload.delete({
      collection: "pages",
      id: prior.docs[0].id as string,
      overrideAccess: true,
      context: { disableRevalidate: true },
    });
    console.log(`deleted prior about page: ${prior.docs[0].id}`);
  }

  // 4) The published page — Hero + RichText + Media + CTA + SEO meta.
  const page = await payload.create({
    collection: "pages",
    overrideAccess: true,
    context: { disableRevalidate: true }, // standalone process: no Next cache to bust
    data: {
      title: "About Yours Fairy Tale",
      slug: "about",
      _status: "published",
      meta: {
        title: "About — Yours Fairy Tale",
        description:
          "Personalized animated fairy tales starring your child as the hero — a keepsake film to watch again and again.",
        image: mediaId,
      },
      layout: [
        {
          blockType: "hero",
          eyebrow: "Keepsakes, not content",
          heading: "Your child, the hero of their own film",
          subcopy:
            "Share a few photos and a little about them. We craft a short, cinematic fairy tale they will ask to watch again and again.",
          background: "cream",
          ctas: [
            { link: { label: "Make their story", url: "/#build", newTab: false }, variant: "primary" },
            { link: { label: "See sample films", url: "/#collections", newTab: false }, variant: "secondary" },
          ],
        },
        {
          blockType: "richText",
          content: lexical([
            "Every child is the hero of a story worth telling. We turn the small details parents know by heart — a favorite animal, a brave streak, the way they say goodnight — into a short animated film.",
            "It is made to be kept: a quiet thing to return to on birthdays, on hard days, and years from now.",
          ]),
        },
        {
          blockType: "mediaBlock",
          media: mediaId,
          caption: "A small dreamer among the stars.",
          aspect: "video",
        },
        {
          blockType: "cta",
          heading: "Ready to begin their adventure?",
          subcopy: "It takes a few minutes to share the details. The rest is ours to make.",
          background: "yellow",
          buttons: [{ link: { label: "Start their story", url: "/#build", newTab: false } }],
        },
      ],
    },
  });

  console.log(`\npage published: id=${page.id} slug=${page.slug} status=${(page as { _status?: string })._status}`);
  console.log(`blocks: ${(page.layout ?? []).map((b: { blockType: string }) => b.blockType).join(", ")}`);
  console.log(`meta.image: ${typeof page.meta?.image === "object" ? page.meta?.image?.id : page.meta?.image}`);
  console.log("\n→ visit /about on the test-branch server");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed failed:", err);
    process.exit(1);
  });
