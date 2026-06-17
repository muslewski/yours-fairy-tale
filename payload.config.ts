import path from "path";
import { fileURLToPath } from "url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import { buildConfig } from "payload";

import { Admins } from "./collections/Admins";
import { Accounts } from "./collections/auth/Accounts";
import { Sessions } from "./collections/auth/Sessions";
import { Users } from "./collections/auth/Users";
import { Verifications } from "./collections/auth/Verifications";
import { Media } from "./collections/Media";
import { SiteMedia } from "./collections/SiteMedia";
import { Orders } from "./collections/Orders";
import { Waitlist } from "./collections/Waitlist";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Fail loudly if the signing secret / DB are missing — never boot with an empty
// PAYLOAD_SECRET (every JWT would be signed with "" and trivially forgeable).
const secret = process.env.PAYLOAD_SECRET;
if (!secret) throw new Error("PAYLOAD_SECRET env var is required");
// DATABASE_URI is what we set locally and in tests; on Vercel the Neon
// integration auto-provisions POSTGRES_URL (pooled), so fall back to it in prod.
const connectionString = process.env.DATABASE_URI ?? process.env.POSTGRES_URL;
if (!connectionString)
  throw new Error("DATABASE_URI (or POSTGRES_URL) env var is required");

export default buildConfig({
  // Payload's own admin panel logs in via the `admins` collection (native auth).
  admin: {
    user: Admins.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    // Payload native auth — staff / dev login for /admin.
    Admins,
    // Better Auth customer collections (plain, no `auth: true`).
    Users,
    Accounts,
    Sessions,
    Verifications,
    // Commerce.
    Orders,
    Waitlist,
    Media,
    SiteMedia,
  ],
  plugins: [
    // Media storage. Pass-through mode (disablePayloadAccessControl NOT set):
    // file URLs stay on Payload's /api/media/file/* endpoint, so the
    // collection's `read: adminOnly` keeps gating every byte; Payload streams
    // from Blob behind the scenes. Customer-facing delivery goes through the
    // ownership-checked video route, which proxies from Blob directly.
    // In dev with no token the plugin is disabled and local-disk staticDir
    // (collections/Media.ts) still applies.
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: {
        media: true,
        "site-media": {
          // Public marketing assets: serve direct CDN URLs (no Payload proxy)
          // and namespace them under `site/` in the shared store.
          disablePayloadAccessControl: true,
          prefix: "site",
        },
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // Admin-panel uploads go browser → Blob directly (bypasses Vercel's
      // ~4.5MB request cap — final films are hundreds of MB). The /studio
      // panel has its own client-upload route for the same reason.
      clientUploads: true,
      // @vercel/blob v2 THROWS on an existing pathname (no silent overwrite),
      // so re-uploading a same-named asset would 500 with "blob already exists".
      // Suffix every plugin upload to a unique name. (The /studio video route is
      // separate — it owns its own unique `${orderId}-${kind}-${ts}` pathnames.)
      addRandomSuffix: true,
    }),
  ],
  editor: lexicalEditor(),
  secret,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString,
    },
    // String UUID primary keys for every collection — Postgres mints them.
    // Chosen now so the later Better Auth integration (which uses string ids)
    // lines up without a primary-key migration.
    idType: "uuid",
    // Migrations live here. Dev still uses drizzle push (NODE_ENV !== production);
    // prod has no push, so schema changes reach prod ONLY via `payload migrate`
    // run against the prod DB. See tech-debt/no-production-db-migrations.md.
    migrationDir: path.resolve(dirname, "migrations"),
  }),
});
