import path from "path";
import { fileURLToPath } from "url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

import { Admins } from "./collections/Admins";
import { Accounts } from "./collections/auth/Accounts";
import { Sessions } from "./collections/auth/Sessions";
import { Users } from "./collections/auth/Users";
import { Verifications } from "./collections/auth/Verifications";
import { Media } from "./collections/Media";
import { Orders } from "./collections/Orders";

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
    Media,
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
