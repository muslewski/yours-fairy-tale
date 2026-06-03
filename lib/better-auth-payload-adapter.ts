/**
 * Custom Better Auth -> Payload database adapter.
 *
 * Routes ALL Better Auth DB operations through Payload's Local API against
 * Payload-managed collections (`users`, `sessions`, `accounts`,
 * `verifications`). This makes every BA model a first-class Payload collection:
 * Payload owns the schema, the rows show up in `/admin`, and they stay usable by
 * Payload access control / relationships. BA never touches Postgres directly.
 *
 * WHY HAND-ROLLED: the off-the-shelf `@payload-auth/better-auth-db-adapter` is
 * deprecated and pins payload@3.28 / better-auth@1.2; on our stack (payload 3.85
 * / better-auth 1.6) its sign-IN path silently fails. Rather than patch a dead
 * package we own the mapping here, built on BA's official `createAdapterFactory`.
 *
 * DESIGN
 *  - Built on `createAdapterFactory` (from `better-auth/adapters`) so BA
 *    normalizes where-clauses (`CleanedWhere`), sorting, select, etc. before they
 *    reach us. We implement only the raw CRUD against Payload's Local API.
 *  - GENERIC: BA model name -> Payload slug via MODEL_TO_SLUG; BA fields map 1:1
 *    to Payload fields because the collections name their fields with BA's exact
 *    camelCase field names (zero translation).
 *  - IDs: string UUIDs minted by Postgres (db-postgres `idType: 'uuid'`). We set
 *    `disableIdGeneration: true` so BA never sends an id; Payload generates it
 *    and we return the created doc (BA reads the uuid back as the record id).
 *  - depth: 0 on every read so relationship fields (e.g. `account.userId`) come
 *    back as plain string ids, which is what BA expects.
 *  - transaction: false — declared honestly. Payload's Local API has no
 *    user-facing nested-transaction primitive we can hand BA, so BA runs ops
 *    sequentially. Declaring it stops BA's "Adapter does not correctly implement
 *    transaction function, patching it automatically" warning.
 */
import { createAdapterFactory, type CleanedWhere } from "better-auth/adapters";
import type { CollectionSlug, Where as PayloadWhere } from "payload";

import { getPayloadClient } from "@/lib/payload";

/**
 * BA model name -> Payload collection slug.
 *
 * Slugs are plural. Anything not listed falls back to `${model}s` so future
 * models (e.g. an org plugin) map automatically once their collections exist;
 * add explicit entries here only when the naming isn't a simple plural.
 */
const MODEL_TO_SLUG: Record<string, string> = {
  user: "users",
  session: "sessions",
  account: "accounts",
  verification: "verifications",
};

function slugFor(model: string): CollectionSlug {
  return (MODEL_TO_SLUG[model] ?? `${model}s`) as CollectionSlug;
}

/** Payload's Local API returns richly-typed docs; BA wants loose records. */
type AnyDoc = Record<string, unknown>;
const asDoc = (doc: unknown): AnyDoc => doc as AnyDoc;

/**
 * Translate one BA `CleanedWhere` clause into a Payload field-condition object.
 * BA has already resolved field names and split AND/OR connectors for us.
 */
function whereConditionFor(w: CleanedWhere): Record<string, unknown> {
  const { field, value, operator } = w;
  switch (operator) {
    case "eq":
      return { [field]: { equals: value } };
    case "ne":
      return { [field]: { not_equals: value } };
    case "lt":
      return { [field]: { less_than: value } };
    case "lte":
      return { [field]: { less_than_equal: value } };
    case "gt":
      return { [field]: { greater_than: value } };
    case "gte":
      return { [field]: { greater_than_equal: value } };
    case "in":
      return { [field]: { in: value } };
    case "not_in":
      return { [field]: { not_in: value } };
    case "contains":
      return { [field]: { contains: value } };
    case "starts_with":
      return { [field]: { like: `${value}%` } };
    case "ends_with":
      return { [field]: { like: `%${value}` } };
    default:
      return { [field]: { equals: value } };
  }
}

/**
 * Build a Payload `where` from BA's normalized `CleanedWhere[]`, honoring the
 * per-clause AND/OR connector. BA guarantees a single connector kind per query.
 */
function buildWhere(where: CleanedWhere[] | undefined): PayloadWhere {
  if (!where || where.length === 0) return {};
  if (where.length === 1) {
    const clause = where[0];
    if (!clause) return {};
    return whereConditionFor(clause) as PayloadWhere;
  }
  const isOr = where.some((w) => w.connector === "OR");
  const conditions = where.map(whereConditionFor);
  return (isOr ? { or: conditions } : { and: conditions }) as PayloadWhere;
}

/**
 * Reduce a Payload doc to a BA `select` list. BA's transformOutput also filters,
 * but applying it here keeps the contract honest. When no select is given we
 * return the whole doc.
 */
function applySelect<T extends Record<string, unknown>>(
  doc: T,
  select?: string[],
): T {
  if (!select || select.length === 0) return doc;
  const out: Record<string, unknown> = {};
  for (const key of select) out[key] = doc[key];
  return out as T;
}

export const payloadBetterAuthAdapter = createAdapterFactory({
  config: {
    adapterId: "payload-local-api",
    adapterName: "Payload Local API",
    // Postgres mints the UUID id; never let BA generate one. We return the doc
    // Payload created, so BA picks up the generated id.
    disableIdGeneration: true,
    // Payload columns are real Postgres date/boolean/json columns via drizzle,
    // and the Local API hands us native Date/boolean/object values — so leave
    // BA's value translation off (the defaults already match, but be explicit).
    supportsDates: true,
    supportsBooleans: true,
    supportsJSON: true,
    // Payload's Local API exposes no nestable transaction primitive to hand BA.
    // Declaring false (vs leaving it undefined) tells BA to run ops sequentially
    // instead of logging the "does not correctly implement transaction" warning.
    transaction: false,
  },
  adapter: () => ({
    async create({ model, data, select }) {
      const p = await getPayloadClient();
      const doc = await p.create({
        collection: slugFor(model),
        data: data as never,
        depth: 0,
      });
      return applySelect(asDoc(doc), select) as never;
    },

    async findOne({ model, where, select }) {
      const p = await getPayloadClient();
      const res = await p.find({
        collection: slugFor(model),
        where: buildWhere(where),
        depth: 0,
        limit: 1,
        pagination: false,
      });
      const doc = res.docs[0];
      if (!doc) return null;
      return applySelect(asDoc(doc), select) as never;
    },

    async findMany({ model, where, limit, sortBy, offset, select }) {
      const p = await getPayloadClient();
      const res = await p.find({
        collection: slugFor(model),
        where: buildWhere(where),
        depth: 0,
        limit: limit ?? 0,
        page: offset && limit ? Math.floor(offset / limit) + 1 : undefined,
        sort: sortBy
          ? `${sortBy.direction === "desc" ? "-" : ""}${sortBy.field}`
          : undefined,
        pagination: limit ? true : false,
      });
      let docs = res.docs.map(asDoc);
      // Payload paginates by page, not raw offset. When the offset isn't a clean
      // multiple of limit, trim the leading remainder so callers get exactly the
      // window they asked for.
      if (offset && limit) {
        const remainder = offset % limit;
        if (remainder) docs = docs.slice(remainder);
      } else if (offset) {
        docs = docs.slice(offset);
      }
      return docs.map((d) => applySelect(d, select)) as never;
    },

    async update({ model, where, update }) {
      const p = await getPayloadClient();
      const res = await p.update({
        collection: slugFor(model),
        where: buildWhere(where),
        data: update as never,
        depth: 0,
      });
      const doc = res.docs[0];
      return (doc ? asDoc(doc) : null) as never;
    },

    async updateMany({ model, where, update }) {
      const p = await getPayloadClient();
      const res = await p.update({
        collection: slugFor(model),
        where: buildWhere(where),
        data: update as never,
        depth: 0,
      });
      return res.docs.length;
    },

    async delete({ model, where }) {
      const p = await getPayloadClient();
      await p.delete({
        collection: slugFor(model),
        where: buildWhere(where),
        depth: 0,
      });
    },

    async deleteMany({ model, where }) {
      const p = await getPayloadClient();
      const res = await p.delete({
        collection: slugFor(model),
        where: buildWhere(where),
        depth: 0,
      });
      return res.docs.length;
    },

    async count({ model, where }) {
      const p = await getPayloadClient();
      const res = await p.count({
        collection: slugFor(model),
        where: buildWhere(where),
      });
      return res.totalDocs;
    },
  }),
});
