import path from "path";
import { fileURLToPath } from "url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

import { Admins } from "./collections/Admins";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  // Payload's own admin panel logs in via the `admins` collection (native auth).
  admin: {
    user: Admins.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // Only `admins` exists for now (staff/dev login). Customer auth (Better Auth
  // users/accounts/sessions/verifications), Orders, and Media are later slices.
  collections: [Admins],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || "",
    },
    // String UUID primary keys for every collection — Postgres mints them.
    // Chosen now so the later Better Auth integration (which uses string ids)
    // lines up without a primary-key migration.
    idType: "uuid",
  }),
});
