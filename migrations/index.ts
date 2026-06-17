import * as migration_20260604_000000_wizard_order_fields from "./20260604_000000_wizard_order_fields";
import * as migration_20260605_000000_order_customer_notes from "./20260605_000000_order_customer_notes";
import * as migration_20260610_000000_waitlist from "./20260610_000000_waitlist";
import * as migration_20260610_000001_order_amount_promise from "./20260610_000001_order_amount_promise";
import * as migration_20260613_000000_media_site_media from "./20260613_000000_media_site_media";
import * as migration_20260616_000000_locked_docs_rels_waitlist_sitemedia from "./20260616_000000_locked_docs_rels_waitlist_sitemedia";
import * as migration_20260616_000001_order_in_studio_since from "./20260616_000001_order_in_studio_since";
import * as migration_20260617_000000_orders_access_token from "./20260617_000000_orders_access_token";
import * as migration_20260617_000001_orders_delivery_urls from "./20260617_000001_orders_delivery_urls";

export const migrations = [
  {
    up: migration_20260604_000000_wizard_order_fields.up,
    down: migration_20260604_000000_wizard_order_fields.down,
    name: "20260604_000000_wizard_order_fields",
  },
  {
    up: migration_20260605_000000_order_customer_notes.up,
    down: migration_20260605_000000_order_customer_notes.down,
    name: "20260605_000000_order_customer_notes",
  },
  {
    up: migration_20260610_000000_waitlist.up,
    down: migration_20260610_000000_waitlist.down,
    name: "20260610_000000_waitlist",
  },
  {
    up: migration_20260610_000001_order_amount_promise.up,
    down: migration_20260610_000001_order_amount_promise.down,
    name: "20260610_000001_order_amount_promise",
  },
  {
    up: migration_20260613_000000_media_site_media.up,
    down: migration_20260613_000000_media_site_media.down,
    name: "20260613_000000_media_site_media",
  },
  {
    up: migration_20260616_000000_locked_docs_rels_waitlist_sitemedia.up,
    down: migration_20260616_000000_locked_docs_rels_waitlist_sitemedia.down,
    name: "20260616_000000_locked_docs_rels_waitlist_sitemedia",
  },
  {
    up: migration_20260616_000001_order_in_studio_since.up,
    down: migration_20260616_000001_order_in_studio_since.down,
    name: "20260616_000001_order_in_studio_since",
  },
  {
    up: migration_20260617_000000_orders_access_token.up,
    down: migration_20260617_000000_orders_access_token.down,
    name: "20260617_000000_orders_access_token",
  },
  {
    up: migration_20260617_000001_orders_delivery_urls.up,
    down: migration_20260617_000001_orders_delivery_urls.down,
    name: "20260617_000001_orders_delivery_urls",
  },
];
